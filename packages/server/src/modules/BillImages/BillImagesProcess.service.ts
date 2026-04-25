import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createCanvas,
  DOMMatrix as CanvasDOMMatrix,
  ImageData as CanvasImageData,
  Path2D as CanvasPath2D,
} from '@napi-rs/canvas';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { lookup as getMimeType } from 'mime-types';
import * as moment from 'moment';
import { extname } from 'path';
import OpenAI from 'openai';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { S3_CLIENT } from '@/modules/S3/S3.module';
import { ContactEmbeddingsRepository } from '@/modules/Embeddings/repositories/ContactEmbeddings.repository';
import { TransactionEmbeddingsRepository } from '@/modules/Embeddings/repositories/TransactionEmbeddings.repository';
import { normalizeText, normalizeVendorName } from '@/modules/Embeddings/utils/normalize';
import {
  BILL_IMAGE_ACCOUNT_MAPPING_PROMPT,
  BILL_IMAGE_OCR_PROMPT,
  BILL_IMAGE_PARSE_PROMPT,
  BILL_IMAGE_STATUSES,
  SUPPORTED_EXPENSE_ACCOUNT_TYPES,
} from './BillImages.constants';
import { BillImage } from './models/BillImage.model';

type ExtractedBillData = {
  vendorName: string | null;
  expenseMemo: string | null;
  billNumber: string | null;
  invoiceNumber: string | null;
  documentDate: string | null;
  dueDate: string | null;
  currencyCode: string | null;
  subtotalAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  notes: string | null;
};

type ParsedBillLineItem = {
  name: string | null;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
  notes: string | null;
};

type ParsedBillData = {
  vendor: {
    name: string | null;
    address: string | null;
    phone: string | null;
    taxId: string | null;
  };
  invoice: {
    invoiceNo: string | null;
    date: string | null;
    time: string | null;
  };
  currencySymbol: string | null;
  items: ParsedBillLineItem[];
  totals: {
    subtotal: number | null;
    discount: number | null;
    tax: number | null;
    service: number | null;
    grandTotal: number | null;
  };
  notes: string | null;
};

type VendorCandidate = {
  contactId: number;
  displayName: string;
  companyName: string | null;
  matchedBy: 'companyName' | 'fullName';
  distance: number;
};

type ExpenseAccountOption = {
  accountId: number;
  name: string;
  code: string | null;
  accountType: string;
};

type ExpenseAccountCandidate = {
  accountId: number;
  name: string;
  code: string | null;
  accountType: string;
  distance: number;
  matchedTransactionId: number;
  matchedNote: string | null;
  matchCount: number;
};

type ExpenseAccountExample = {
  transactionId: number;
  accountId: number;
  accountName: string;
  accountCode: string | null;
  accountType: string;
  note: string | null;
  date: string | null;
  distance: number;
};

type BillMappingDecision = {
  selectedVendorContactId: number | null;
  selectedExpenseAccountId: number | null;
  expenseMemo: string | null;
  internalNotes: string | null;
  rationale: string | null;
};

type BillImageReviewItem = {
  id: number;
  bankAccountId: number | null;
  apId: number | null;
  mode: 'paid' | 'payable';
  imageUrl: string;
  fileType: 'image' | 'pdf';
  ocrText: string | null;
  billData: Record<string, unknown> | null;
  previousReview: {
    id: number;
    mode: 'paid' | 'payable';
  } | null;
  nextReview: {
    id: number;
    mode: 'paid' | 'payable';
  } | null;
};

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

// Keep PDF.js loading as a native ESM import even though the server is built as CommonJS.
const nativeModuleImport = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<unknown>;

function ensurePdfJsGlobals() {
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = CanvasDOMMatrix;
  }

  if (typeof (globalThis as any).ImageData === 'undefined') {
    (globalThis as any).ImageData = CanvasImageData;
  }

  if (typeof (globalThis as any).Path2D === 'undefined') {
    (globalThis as any).Path2D = CanvasPath2D;
  }
}

const PARSED_BILL_SCHEMA = {
  type: 'json_schema',
  name: 'parsed_bill',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      vendor: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: ['string', 'null'] },
          address: { type: ['string', 'null'] },
          phone: { type: ['string', 'null'] },
          taxId: { type: ['string', 'null'] },
        },
        required: ['name', 'address', 'phone', 'taxId'],
      },
      invoice: {
        type: 'object',
        additionalProperties: false,
        properties: {
          invoiceNo: { type: ['string', 'null'] },
          date: { type: ['string', 'null'] },
          time: { type: ['string', 'null'] },
        },
        required: ['invoiceNo', 'date', 'time'],
      },
      currencySymbol: { type: ['string', 'null'] },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: ['string', 'null'] },
            quantity: { type: ['number', 'null'] },
            unitPrice: { type: ['number', 'null'] },
            lineTotal: { type: ['number', 'null'] },
            notes: { type: ['string', 'null'] },
          },
          required: ['name', 'quantity', 'unitPrice', 'lineTotal', 'notes'],
        },
      },
      totals: {
        type: 'object',
        additionalProperties: false,
        properties: {
          subtotal: { type: ['number', 'null'] },
          discount: { type: ['number', 'null'] },
          tax: { type: ['number', 'null'] },
          service: { type: ['number', 'null'] },
          grandTotal: { type: ['number', 'null'] },
        },
        required: ['subtotal', 'discount', 'tax', 'service', 'grandTotal'],
      },
      notes: { type: ['string', 'null'] },
    },
    required: ['vendor', 'invoice', 'currencySymbol', 'items', 'totals', 'notes'],
  },
} as const;

const BILL_MAPPING_DECISION_SCHEMA = {
  type: 'json_schema',
  name: 'bill_mapping_decision',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      selectedVendorContactId: { type: ['integer', 'null'] },
      selectedExpenseAccountId: { type: ['integer', 'null'] },
      expenseMemo: { type: ['string', 'null'] },
      internalNotes: { type: ['string', 'null'] },
      rationale: { type: ['string', 'null'] },
    },
    required: [
      'selectedVendorContactId',
      'selectedExpenseAccountId',
      'expenseMemo',
      'internalNotes',
      'rationale',
    ],
  },
} as const;

@Injectable()
export class BillImagesProcessService {
  private readonly logger = new Logger(BillImagesProcessService.name);
  private readonly openAiApiKey?: string;
  private readonly openAiEmbeddingModel: string;
  private readonly openAiParseModel: string;
  private readonly openAiJournalModel: string;
  private readonly runpodApiKey?: string;
  private readonly runpodEndpointId?: string;
  private readonly runpodModel: string;
  private readonly fetchBatchSize: number;
  private readonly vendorMatchLimit: number;
  private readonly transactionMatchLimit: number;
  private readonly pollIntervalMs: number;
  private readonly requestTimeoutMs: number;
  private pdfJsPromise?: Promise<PdfJsModule>;

  constructor(
    private readonly configService: ConfigService,
    @Inject(BillImage.name)
    private readonly billImageModel: TenantModelProxy<typeof BillImage>,
    @Inject(Vendor.name)
    private readonly vendorModel: TenantModelProxy<typeof Vendor>,
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
    @Inject(S3_CLIENT)
    private readonly s3Client: S3Client,
    private readonly contactEmbeddingsRepository: ContactEmbeddingsRepository,
    private readonly transactionEmbeddingsRepository: TransactionEmbeddingsRepository,
  ) {
    this.openAiApiKey = this.configService.get<string>('aiEmbeddings.apiKey');
    this.openAiEmbeddingModel = this.configService.get<string>(
      'aiEmbeddings.model',
      'text-embedding-3-large',
    );
    this.openAiParseModel = this.configService.get<string>(
      'billImageAi.parseModel',
      'gpt-5.4-mini',
    );
    this.openAiJournalModel = this.configService.get<string>(
      'billImageAi.journalModel',
      'gpt-5.4',
    );
    this.runpodApiKey = this.configService.get<string>('billImageAi.runpodApiKey');
    this.runpodEndpointId = this.configService.get<string>(
      'billImageAi.runpodEndpointId',
    );
    this.runpodModel = this.configService.get<string>(
      'billImageAi.runpodModel',
      'gemma3:27b',
    );
    this.fetchBatchSize = this.configService.get<number>(
      'billImageAi.fetchBatchSize',
      25,
    );
    this.vendorMatchLimit = this.configService.get<number>(
      'billImageAi.vendorMatchLimit',
      10,
    );
    this.transactionMatchLimit = this.configService.get<number>(
      'billImageAi.transactionMatchLimit',
      15,
    );
    this.pollIntervalMs = this.configService.get<number>(
      'billImageAi.pollIntervalMs',
      1500,
    );
    this.requestTimeoutMs = this.configService.get<number>(
      'billImageAi.requestTimeoutMs',
      120000,
    );
  }

  async getSummary() {
    const [mapPendingCount, reviewPendingCount] = await Promise.all([
      this.countMapPendingRows(),
      this.countReviewPendingRows(),
    ]);

    return {
      mapPendingCount,
      reviewPendingCount,
    };
  }

  async getNextReview(): Promise<BillImageReviewItem | null> {
    const row = await this.billImageModel()
      .query()
      .select([
        'id',
        's3_link as s3Link',
        'bank_account_id as bankAccountId',
        'ap_id as apId',
        'ocr_text as ocrText',
        'bill_data as billData',
      ])
      .where('ocrStatus', BILL_IMAGE_STATUSES.COMPLETED)
      .where('mappingStatus', BILL_IMAGE_STATUSES.COMPLETED)
      .where('publishStatus', BILL_IMAGE_STATUSES.PENDING)
      .orderBy('id', 'asc')
      .first();

    return row ? this.transformReviewRow(row) : null;
  }

  async getReviewById(id: number): Promise<BillImageReviewItem | null> {
    const row = await this.billImageModel()
      .query()
      .select([
        'id',
        's3_link as s3Link',
        'bank_account_id as bankAccountId',
        'ap_id as apId',
        'ocr_text as ocrText',
        'bill_data as billData',
      ])
      .where('id', id)
      .where('ocrStatus', BILL_IMAGE_STATUSES.COMPLETED)
      .where('mappingStatus', BILL_IMAGE_STATUSES.COMPLETED)
      .first();

    return row ? this.transformReviewRow(row) : null;
  }

  async markPublished(id: number) {
    const patched = await this.billImageModel()
      .query()
      .where('id', id)
      .patch({
        publishStatus: BILL_IMAGE_STATUSES.COMPLETED,
        publishAt: this.timestamp(),
        lastError: null,
        updatedAt: this.timestamp(),
      });

    return {
      updated: patched > 0,
      id,
    };
  }

  async processPendingBillImages() {
    this.assertConfiguration();
    await this.contactEmbeddingsRepository.ensureTable();
    await this.transactionEmbeddingsRepository.ensureTable();

    const ocrProcessedCount = await this.processPendingOcrRows();
    const mappedCount = await this.processPendingMappingRows();

    return {
      ocrProcessedCount,
      mappedCount,
    };
  }

  private async countMapPendingRows(): Promise<number> {
    const row = (await this.billImageModel()
      .query()
      .where((query) => {
        query
          .where('ocrStatus', BILL_IMAGE_STATUSES.PENDING)
          .orWhere('mappingStatus', BILL_IMAGE_STATUSES.PENDING);
      })
      .count({ count: '*' })
      .first()) as BillImage & { count?: string | number };

    return Number(row?.count || 0);
  }

  private async countReviewPendingRows(): Promise<number> {
    const row = (await this.billImageModel()
      .query()
      .where('ocrStatus', BILL_IMAGE_STATUSES.COMPLETED)
      .where('mappingStatus', BILL_IMAGE_STATUSES.COMPLETED)
      .where('publishStatus', BILL_IMAGE_STATUSES.PENDING)
      .count({ count: '*' })
      .first()) as BillImage & { count?: string | number };

    return Number(row?.count || 0);
  }

  private async processPendingOcrRows(): Promise<number> {
    let processedCount = 0;

    while (true) {
      const rows = await this.billImageModel()
        .query()
        .select(['id', 's3_link as s3Link'])
        .where('ocrStatus', BILL_IMAGE_STATUSES.PENDING)
        .orderBy('id', 'asc')
        .limit(this.fetchBatchSize);

      if (!rows.length) {
        break;
      }

      for (const row of rows) {
        const claimed = await this.claimOcrRow(row.id);

        if (!claimed) {
          continue;
        }

        try {
          const image = await this.downloadBillImage(row.s3Link);
          const ocrText = await this.runOcr(row.s3Link, image);

          await this.markOcrSuccess(row.id, ocrText);
          processedCount += 1;
        } catch (error) {
          await this.markOcrError(row.id, this.getErrorMessage(error));
        }
      }
    }

    return processedCount;
  }

  private async processPendingMappingRows(): Promise<number> {
    let processedCount = 0;

    while (true) {
      const rows = await this.billImageModel()
        .query()
        .select([
          'id',
          'ocr_text as ocrText',
          'bank_account_id as bankAccountId',
          'ap_id as apId',
        ])
        .where('ocrStatus', BILL_IMAGE_STATUSES.COMPLETED)
        .where('mappingStatus', BILL_IMAGE_STATUSES.PENDING)
        .orderBy('id', 'asc')
        .limit(this.fetchBatchSize);

      if (!rows.length) {
        break;
      }

      for (const row of rows) {
        const claimed = await this.claimMappingRow(row.id);

        if (!claimed) {
          continue;
        }

        try {
          const billData = await this.buildBillData(
            row.ocrText,
            row.bankAccountId,
            row.apId,
          );

          await this.markMappingSuccess(row.id, billData);
          processedCount += 1;
        } catch (error) {
          await this.markMappingError(row.id, this.getErrorMessage(error));
        }
      }
    }

    return processedCount;
  }

  private async buildBillData(
    ocrText: string | null,
    bankAccountId: number | null,
    apId: number | null,
  ) {
    const normalizedOcrText = collapseLargeText(ocrText || '');
    const parsedBill = await this.parseBillText(normalizedOcrText);
    const extracted = this.extractBillDataFromParsedBill(parsedBill);
    const vendorSearchText = normalizeVendorName(
      parsedBill.vendor.name || extracted.vendorName || normalizedOcrText,
    );
    const expenseMemoSearchText = normalizeText(
      this.buildInvoiceMemo(parsedBill) ||
        extracted.expenseMemo ||
        normalizedOcrText,
    );

    const [vendorCandidates, expenseAccountContext, accountOptions] =
      await Promise.all([
      this.findVendorCandidates(vendorSearchText),
      this.findExpenseAccountContext(expenseMemoSearchText),
      this.listCandidateExpenseAccounts(),
    ]);
    const mappingDecision = await this.generateBillMappingDecision({
      ocrText: normalizedOcrText,
      parsedBill,
      extracted,
      vendorCandidates,
      expenseAccountCandidates: expenseAccountContext.candidates,
      expenseAccountExamples: expenseAccountContext.examples,
      accountOptions,
    });

    const vendorMatch = mappingDecision.selectedVendorContactId
      ? vendorCandidates.find(
          (candidate) =>
            candidate.contactId === mappingDecision.selectedVendorContactId,
        ) || null
      : null;

    const selectedAccountOption = mappingDecision.selectedExpenseAccountId
      ? accountOptions.find(
          (candidate) =>
            candidate.accountId === mappingDecision.selectedExpenseAccountId,
        ) || null
      : null;
    const selectedAccountEvidence = mappingDecision.selectedExpenseAccountId
      ? expenseAccountContext.candidates.find(
          (candidate) =>
            candidate.accountId === mappingDecision.selectedExpenseAccountId,
        ) || null
      : null;
    const expenseAccountMatch = selectedAccountOption
      ? {
          accountId: selectedAccountOption.accountId,
          name: selectedAccountOption.name,
          code: selectedAccountOption.code,
          accountType: selectedAccountOption.accountType,
          distance: selectedAccountEvidence?.distance ?? 0,
          matchedTransactionId:
            selectedAccountEvidence?.matchedTransactionId ?? null,
          matchedNote: selectedAccountEvidence?.matchedNote ?? null,
          matchCount: selectedAccountEvidence?.matchCount ?? 0,
        }
      : null;

    const normalizedExtracted = {
      ...extracted,
      expenseMemo:
        toNullableString(mappingDecision.expenseMemo) || extracted.expenseMemo,
      notes:
        toNullableString(mappingDecision.internalNotes) || extracted.notes,
    };

    return {
      extracted: normalizedExtracted,
      suggestions: {
        vendor: vendorMatch,
        expenseAccount: expenseAccountMatch,
      },
      candidates: {
        vendors: vendorCandidates,
        expenseAccounts: expenseAccountContext.candidates,
        expenseAccountExamples: expenseAccountContext.examples,
        accountOptions,
      },
      parsedBill,
      decision: mappingDecision,
      context: {
        bankAccountId,
        apId,
        mappedAt: new Date().toISOString(),
      },
    };
  }

  private async parseBillText(ocrText: string): Promise<ParsedBillData> {
    if (!normalizeText(ocrText)) {
      return this.getEmptyParsedBillData();
    }

    try {
      const response = await this.getOpenAiClient().responses.create({
        model: this.openAiParseModel,
        instructions: BILL_IMAGE_PARSE_PROMPT,
        input: ocrText,
        text: {
          format: PARSED_BILL_SCHEMA as any,
        },
      });

      return this.parseParsedBillData(response.output_text);
    } catch (error) {
      this.logger.warn(
        `Falling back to empty parsed bill data because parsing failed: ${this.getErrorMessage(
          error,
        )}`,
      );

      return this.getEmptyParsedBillData();
    }
  }

  private async findVendorCandidates(text: string): Promise<VendorCandidate[]> {
    if (!text) {
      return [];
    }

    const vector = await this.embedText(text);

    if (!vector) {
      return [];
    }

    const [companyMatches, fullNameMatches] = await Promise.all([
      this.contactEmbeddingsRepository.searchByCompanyNameEmbedding(
        vector,
        this.vendorMatchLimit,
      ),
      this.contactEmbeddingsRepository.searchByFullNameEmbedding(
        vector,
        this.vendorMatchLimit,
      ),
    ]);

    const mergedMatches = new Map<
      number,
      { distance: number; matchedBy: 'companyName' | 'fullName' }
    >();

    for (const match of companyMatches) {
      mergedMatches.set(match.record.contactId, {
        distance: match.distance,
        matchedBy: 'companyName',
      });
    }
    for (const match of fullNameMatches) {
      const existing = mergedMatches.get(match.record.contactId);

      if (!existing || match.distance < existing.distance) {
        mergedMatches.set(match.record.contactId, {
          distance: match.distance,
          matchedBy: 'fullName',
        });
      }
    }

    const vendors = await this.vendorModel()
      .query()
      .select([
        'id',
        'display_name as displayName',
        'company_name as companyName',
        'active',
      ])
      .findByIds(Array.from(mergedMatches.keys()))
      .where('active', true);

    return vendors
      .map((vendor) => {
        const match = mergedMatches.get(vendor.id);

        if (!match) {
          return null;
        }

        return {
          contactId: vendor.id,
          displayName: vendor.displayName,
          companyName: vendor.companyName || null,
          matchedBy: match.matchedBy,
          distance: match.distance,
        } as VendorCandidate;
      })
      .filter(Boolean)
      .sort((left, right) => left.distance - right.distance);
  }

  private async findExpenseAccountContext(
    text: string,
  ): Promise<{
    candidates: ExpenseAccountCandidate[];
    examples: ExpenseAccountExample[];
  }> {
    if (!text) {
      return {
        candidates: [],
        examples: [],
      };
    }

    const vector = await this.embedText(text);

    if (!vector) {
      return {
        candidates: [],
        examples: [],
      };
    }

    const transactionMatches =
      await this.transactionEmbeddingsRepository.searchByNoteEmbedding(
        vector,
        this.transactionMatchLimit,
      );

    if (!transactionMatches.length) {
      return {
        candidates: [],
        examples: [],
      };
    }

    const matchedTransactions = await this.accountTransactionModel()
      .query()
      .select(['id', 'account_id as accountId', 'note', 'date'])
      .findByIds(transactionMatches.map((match) => match.record.transactionId));

    const eligibleAccounts = await this.accountModel()
      .query()
      .select(['id', 'name', 'code', 'account_type as accountType', 'active'])
      .whereIn('account_type', SUPPORTED_EXPENSE_ACCOUNT_TYPES)
      .where('active', true);

    const accountById = new Map(
      eligibleAccounts.map((account) => [account.id, account]),
    );
    const transactionById = new Map(
      matchedTransactions.map((transaction) => [transaction.id, transaction]),
    );
    const rankedAccounts = new Map<
      number,
      {
        distance: number;
        matchedTransactionId: number;
        matchedNote: string | null;
        matchCount: number;
      }
    >();
    const examples: ExpenseAccountExample[] = [];

    for (const match of transactionMatches) {
      const transaction = transactionById.get(match.record.transactionId);

      if (!transaction || !accountById.has(transaction.accountId)) {
        continue;
      }

      const account = accountById.get(transaction.accountId);

      if (account && examples.length < 12) {
        examples.push({
          transactionId: transaction.id,
          accountId: account.id,
          accountName: account.name,
          accountCode: account.code || null,
          accountType: account.accountType,
          note: transaction.note || null,
          date: transaction.date ? String(transaction.date) : null,
          distance: match.distance,
        });
      }

      const existing = rankedAccounts.get(transaction.accountId);

      if (!existing) {
        rankedAccounts.set(transaction.accountId, {
          distance: match.distance,
          matchedTransactionId: transaction.id,
          matchedNote: transaction.note || null,
          matchCount: 1,
        });
        continue;
      }

      if (match.distance < existing.distance) {
        existing.distance = match.distance;
        existing.matchedTransactionId = transaction.id;
        existing.matchedNote = transaction.note || null;
      }
      existing.matchCount += 1;
    }

    const candidates = Array.from(rankedAccounts.entries())
      .map(([accountId, match]) => {
        const account = accountById.get(accountId);

        if (!account) {
          return null;
        }

        return {
          accountId,
          name: account.name,
          code: account.code || null,
          accountType: account.accountType,
          distance: match.distance,
          matchedTransactionId: match.matchedTransactionId,
          matchedNote: match.matchedNote,
          matchCount: match.matchCount,
        } as ExpenseAccountCandidate;
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left.distance !== right.distance) {
          return left.distance - right.distance;
        }
        return right.matchCount - left.matchCount;
      });

    return {
      candidates,
      examples,
    };
  }

  private async listCandidateExpenseAccounts(): Promise<ExpenseAccountOption[]> {
    const rows = await this.accountModel()
      .query()
      .select(['id', 'name', 'code', 'account_type as accountType', 'active'])
      .whereIn('account_type', SUPPORTED_EXPENSE_ACCOUNT_TYPES)
      .where('active', true)
      .orderBy('name', 'asc');

    return rows.map((account) => ({
      accountId: account.id,
      name: account.name,
      code: account.code || null,
      accountType: account.accountType,
    }));
  }

  private async claimOcrRow(id: number): Promise<boolean> {
    const patched = await this.billImageModel()
      .query()
      .where('id', id)
      .where('ocrStatus', BILL_IMAGE_STATUSES.PENDING)
      .patch({
        ocrStatus: BILL_IMAGE_STATUSES.PROCESSING,
        lastError: null,
        updatedAt: this.timestamp(),
      });

    return patched > 0;
  }

  private async claimMappingRow(id: number): Promise<boolean> {
    const patched = await this.billImageModel()
      .query()
      .where('id', id)
      .where('mappingStatus', BILL_IMAGE_STATUSES.PENDING)
      .where('ocrStatus', BILL_IMAGE_STATUSES.COMPLETED)
      .patch({
        mappingStatus: BILL_IMAGE_STATUSES.PROCESSING,
        lastError: null,
        updatedAt: this.timestamp(),
      });

    return patched > 0;
  }

  private async markOcrSuccess(id: number, ocrText: string) {
    await this.billImageModel()
      .query()
      .where('id', id)
      .patch({
        ocrText,
        ocrStatus: BILL_IMAGE_STATUSES.COMPLETED,
        ocrProcessedAt: this.timestamp(),
        lastError: null,
        updatedAt: this.timestamp(),
      });
  }

  private async markOcrError(id: number, lastError: string) {
    await this.billImageModel()
      .query()
      .where('id', id)
      .patch({
        ocrStatus: BILL_IMAGE_STATUSES.ERROR,
        lastError,
        updatedAt: this.timestamp(),
      });
  }

  private async markMappingSuccess(id: number, billData: Record<string, unknown>) {
    await this.billImageModel()
      .query()
      .where('id', id)
      .patch({
        billData: JSON.stringify(billData),
        mappingStatus: BILL_IMAGE_STATUSES.COMPLETED,
        mappingProcessedAt: this.timestamp(),
        lastError: null,
        updatedAt: this.timestamp(),
      });
  }

  private async markMappingError(id: number, lastError: string) {
    await this.billImageModel()
      .query()
      .where('id', id)
      .patch({
        mappingStatus: BILL_IMAGE_STATUSES.ERROR,
        lastError,
        updatedAt: this.timestamp(),
      });
  }

  private async downloadBillImage(s3Link: string) {
    const { bucket, key } = this.parseS3Link(s3Link);
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`The bill image body is missing for ${s3Link}.`);
    }

    const bytes = await response.Body.transformToByteArray();

    return {
      buffer: Buffer.from(bytes),
      key,
      contentType: response.ContentType || null,
    };
  }

  private async transformReviewRow(row: {
    id: number;
    s3Link: string;
    bankAccountId: number | null;
    apId: number | null;
    ocrText: string | null;
    billData: string | null;
  }): Promise<BillImageReviewItem> {
    const [previousReview, nextReview] = await Promise.all([
      this.findAdjacentReviewRow(row.id, 'previous'),
      this.findAdjacentReviewRow(row.id, 'next'),
    ]);
    const { bucket, key } = this.parseS3Link(row.s3Link);
    const imageUrl = await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn: 300 },
    );

    return {
      id: row.id,
      bankAccountId: row.bankAccountId || null,
      apId: row.apId || null,
      mode: row.bankAccountId ? 'paid' : 'payable',
      imageUrl,
      fileType: isPdfFile(key, null) ? 'pdf' : 'image',
      ocrText: row.ocrText || null,
      billData: this.parseBillData(row.billData),
      previousReview,
      nextReview,
    };
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    const pdfjs = await this.getPdfJs();
    const document = await pdfjs
      .getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      })
      .promise;

    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str || '' : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText) {
        pages.push(pageText);
      }
    }

    return pages.join('\n\n').trim();
  }

  private isUsefulPdfText(text: string) {
    const normalized = normalizeText(text);

    if (!normalized) {
      return false;
    }

    const words = normalized.split(/\s+/).filter(Boolean);
    const uniqueWords = new Set(words);
    const alphaCharacters = (text.match(/[A-Za-z]/g) || []).length;

    return (
      normalized.length >= 120 &&
      words.length >= 20 &&
      uniqueWords.size >= 8 &&
      alphaCharacters >= 40
    );
  }

  private async convertPdfToImages(buffer: Buffer): Promise<Buffer[]> {
    const pdfjs = await this.getPdfJs();
    const document = await pdfjs
      .getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      })
      .promise;

    const pageImages: Buffer[] = [];

    for (
      let pageNumber = 1;
      pageNumber <= Math.min(document.numPages, 3);
      pageNumber += 1
    ) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      const context = canvas.getContext('2d');

      await page.render({
        canvas: canvas as any,
        canvasContext: context as any,
        viewport,
      }).promise;

      pageImages.push(canvas.toBuffer('image/png'));
    }

    return pageImages;
  }

  private async getPdfJs(): Promise<PdfJsModule> {
    if (!this.pdfJsPromise) {
      ensurePdfJsGlobals();
      this.pdfJsPromise = nativeModuleImport(
        'pdfjs-dist/legacy/build/pdf.mjs',
      ) as Promise<PdfJsModule>;
    }

    return this.pdfJsPromise;
  }

  private async findAdjacentReviewRow(
    currentId: number,
    direction: 'previous' | 'next',
  ): Promise<{ id: number; mode: 'paid' | 'payable' } | null> {
    const comparator = direction === 'previous' ? '<' : '>';
    const sortOrder = direction === 'previous' ? 'desc' : 'asc';

    const row = await this.billImageModel()
      .query()
      .select(['id', 'bank_account_id as bankAccountId'])
      .where('ocrStatus', BILL_IMAGE_STATUSES.COMPLETED)
      .where('mappingStatus', BILL_IMAGE_STATUSES.COMPLETED)
      .where('publishStatus', BILL_IMAGE_STATUSES.PENDING)
      .where('id', comparator, currentId)
      .orderBy('id', sortOrder)
      .first();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      mode: row.bankAccountId ? 'paid' : 'payable',
    };
  }

  private async runOcr(
    s3Link: string,
    image: { buffer: Buffer; key: string; contentType: string | null },
  ): Promise<string> {
    if (isPdfFile(image.key, image.contentType)) {
      const extractedText = await this.extractPdfText(image.buffer);

      if (this.isUsefulPdfText(extractedText)) {
        return extractedText;
      }

      const pageImages = await this.convertPdfToImages(image.buffer);
      const pageTexts: string[] = [];

      for (const pageImage of pageImages.slice(0, 3)) {
        const pageText = await this.runImageCompletion(
          BILL_IMAGE_OCR_PROMPT,
          pageImage.toString('base64'),
          'image/png',
        );

        if (normalizeText(pageText)) {
          pageTexts.push(pageText.trim());
        }
      }

      const combinedPageText = pageTexts.join('\n\n').trim();

      if (!combinedPageText) {
        throw new Error(`OCR did not return useful text for PDF ${s3Link}.`);
      }

      return combinedPageText;
    }

    const mimeType = image.contentType || getMimeType(image.key) || 'image/jpeg';
    const base64Image = image.buffer.toString('base64');

    return this.runImageCompletion(BILL_IMAGE_OCR_PROMPT, base64Image, mimeType);
  }

  private async runImageCompletion(
    prompt: string,
    base64Image: string,
    mimeType: string,
  ): Promise<string> {
    const payload = {
      input: {
        openai_route: '/v1/chat/completions',
        openai_input: {
          model: this.runpodModel,
          stream: false,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
        },
      },
    };

    return this.runRunpodRequest(payload);
  }

  private async runRunpodRequest(payload: Record<string, unknown>) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.runpodApiKey}`,
    };
    const runUrl = `https://api.runpod.ai/v2/${this.runpodEndpointId}/run`;

    const runResponse = await axios.post(runUrl, payload, {
      headers,
      timeout: this.requestTimeoutMs,
    });
    const jobId = runResponse.data?.id;

    if (!jobId) {
      throw new Error('Runpod did not return a job id.');
    }

    const statusUrl = `https://api.runpod.ai/v2/${this.runpodEndpointId}/status/${jobId}`;

    while (true) {
      const statusResponse = await axios.get(statusUrl, {
        headers,
        timeout: this.requestTimeoutMs,
      });
      const body = statusResponse.data || {};
      const status = body.status;

      if (status === 'COMPLETED') {
        return this.extractRunpodContent(body.output);
      }
      if (status === 'FAILED' || status === 'CANCELLED') {
        throw new Error(
          body.error
            ? String(body.error)
            : `Runpod job ${jobId} finished with status ${status}.`,
        );
      }

      await sleep(this.pollIntervalMs);
    }
  }

  private extractRunpodContent(output: unknown): string {
    if (typeof output === 'string') {
      return output.trim();
    }

    if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0] as Record<string, any>;
      return (
        firstItem?.choices?.[0]?.message?.content ||
        firstItem?.message?.content ||
        ''
      ).trim();
    }

    if (output && typeof output === 'object') {
      const value = output as Record<string, any>;
      return (
        value?.choices?.[0]?.message?.content ||
        value?.message?.content ||
        value?.response ||
        value?.content ||
        ''
      ).trim();
    }

    return String(output || '').trim();
  }

  private parseParsedBillData(rawContent: string): ParsedBillData {
    const normalizedContent = rawContent.trim();
    const jsonContent = stripCodeFence(normalizedContent);
    const parsed = JSON.parse(jsonContent);

    return {
      vendor: {
        name: toNullableString(parsed?.vendor?.name),
        address: toNullableString(parsed?.vendor?.address),
        phone: toNullableString(parsed?.vendor?.phone),
        taxId: toNullableString(parsed?.vendor?.taxId),
      },
      invoice: {
        invoiceNo: toNullableString(parsed?.invoice?.invoiceNo),
        date: toNullableString(parsed?.invoice?.date),
        time: toNullableString(parsed?.invoice?.time),
      },
      currencySymbol: toNullableString(parsed?.currencySymbol),
      items: Array.isArray(parsed?.items)
        ? parsed.items.map((item) => ({
            name: toNullableString(item?.name),
            quantity: toNullableNumber(item?.quantity),
            unitPrice: toNullableNumber(item?.unitPrice),
            lineTotal: toNullableNumber(item?.lineTotal),
            notes: toNullableString(item?.notes),
          }))
        : [],
      totals: {
        subtotal: toNullableNumber(parsed?.totals?.subtotal),
        discount: toNullableNumber(parsed?.totals?.discount),
        tax: toNullableNumber(parsed?.totals?.tax),
        service: toNullableNumber(parsed?.totals?.service),
        grandTotal: toNullableNumber(parsed?.totals?.grandTotal),
      },
      notes: toNullableString(parsed?.notes),
    };
  }

  private extractBillDataFromParsedBill(parsedBill: ParsedBillData): ExtractedBillData {
    const subtotal = parsedBill.totals.subtotal;
    const taxAmount = sumNullableNumbers(
      parsedBill.totals.tax,
      parsedBill.totals.service,
    );
    const totalAmount =
      parsedBill.totals.grandTotal ??
      sumNullableNumbers(subtotal, taxAmount) ??
      subtotal;

    return {
      vendorName: parsedBill.vendor.name,
      expenseMemo: this.buildInvoiceMemo(parsedBill),
      billNumber: parsedBill.invoice.invoiceNo,
      invoiceNumber: parsedBill.invoice.invoiceNo,
      documentDate: normalizeInvoiceDate(parsedBill.invoice.date),
      dueDate: null,
      currencyCode: normalizeCurrencyCode(parsedBill.currencySymbol),
      subtotalAmount: subtotal,
      taxAmount,
      totalAmount,
      notes: parsedBill.notes,
    };
  }

  private buildInvoiceMemo(parsedBill: ParsedBillData): string | null {
    const parts = [
      ...parsedBill.items
        .map((item) => item.name || item.notes)
        .filter((value): value is string => Boolean(value))
        .slice(0, 6),
    ];

    if (!parts.length && parsedBill.notes) {
      parts.push(parsedBill.notes);
    }

    return toNullableString(parts.join(' | '));
  }

  private async generateBillMappingDecision({
    ocrText,
    parsedBill,
    extracted,
    vendorCandidates,
    expenseAccountCandidates,
    expenseAccountExamples,
    accountOptions,
  }: {
    ocrText: string;
    parsedBill: ParsedBillData;
    extracted: ExtractedBillData;
    vendorCandidates: VendorCandidate[];
    expenseAccountCandidates: ExpenseAccountCandidate[];
    expenseAccountExamples: ExpenseAccountExample[];
    accountOptions: ExpenseAccountOption[];
  }): Promise<BillMappingDecision> {
    const response = await this.getOpenAiClient().responses.create({
      model: this.openAiJournalModel,
      instructions: BILL_IMAGE_ACCOUNT_MAPPING_PROMPT,
      reasoning: { effort: 'low' },
      tools: [{ type: 'web_search' }],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      input: JSON.stringify(
        {
          ocrText,
          parsedBill,
          extracted,
          vendorCandidates: vendorCandidates.map((candidate) => ({
            contactId: candidate.contactId,
            displayName: candidate.displayName,
            companyName: candidate.companyName,
            matchedBy: candidate.matchedBy,
            similarity: roundSimilarityScore(candidate.distance),
          })),
          expenseAccountCandidates: expenseAccountCandidates.map((candidate) => ({
            accountId: candidate.accountId,
            name: candidate.name,
            code: candidate.code,
            accountType: candidate.accountType,
            matchedTransactionId: candidate.matchedTransactionId,
            matchedNote: candidate.matchedNote,
            matchCount: candidate.matchCount,
            similarity: roundSimilarityScore(candidate.distance),
          })),
          historicalExamples: expenseAccountExamples,
          candidateAccounts: accountOptions,
        },
        null,
        2,
      ),
      text: {
        format: BILL_MAPPING_DECISION_SCHEMA as any,
      },
    });

    const parsed = JSON.parse(response.output_text || '{}');

    return {
      selectedVendorContactId: toNullableInteger(parsed.selectedVendorContactId),
      selectedExpenseAccountId: toNullableInteger(parsed.selectedExpenseAccountId),
      expenseMemo: toNullableString(parsed.expenseMemo),
      internalNotes: toNullableString(parsed.internalNotes),
      rationale: toNullableString(parsed.rationale),
    };
  }

  private parseBillData(value: string | null): Record<string, unknown> | null {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      this.logger.warn(
        `Unable to parse BILL_DATA JSON: ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private getEmptyParsedBillData(): ParsedBillData {
    return {
      vendor: {
        name: null,
        address: null,
        phone: null,
        taxId: null,
      },
      invoice: {
        invoiceNo: null,
        date: null,
        time: null,
      },
      currencySymbol: null,
      items: [],
      totals: {
        subtotal: null,
        discount: null,
        tax: null,
        service: null,
        grandTotal: null,
      },
      notes: null,
    };
  }

  private async embedText(text: string) {
    const normalizedText = normalizeText(text);

    if (!normalizedText) {
      return null;
    }

    const response = await this.getOpenAiClient().embeddings.create({
      model: this.openAiEmbeddingModel,
      input: normalizedText,
    });

    return response.data?.[0]?.embedding || null;
  }

  private getOpenAiClient() {
    return new OpenAI({ apiKey: this.openAiApiKey });
  }

  private parseS3Link(s3Link: string) {
    const bucket = this.configService.get<string>('s3.bucket');

    if (!s3Link.startsWith(`s3://${bucket}/`)) {
      throw new Error(`Unsupported S3 link: ${s3Link}`);
    }

    return {
      bucket,
      key: s3Link.replace(`s3://${bucket}/`, ''),
    };
  }

  private assertConfiguration() {
    const missingKeys = [
      ['aiEmbeddings.apiKey', 'OPENAI_API_KEY'],
      ['billImageAi.runpodApiKey', 'BILL_IMAGE_RUNPOD_API_KEY'],
      ['billImageAi.runpodEndpointId', 'BILL_IMAGE_RUNPOD_ENDPOINT_ID'],
      ['s3.bucket', 'S3_BUCKET'],
    ]
      .filter(([configKey]) => !this.configService.get<string>(configKey))
      .map(([, envKey]) => envKey);

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing bill image processing configuration: ${missingKeys.join(', ')}`,
      );
    }
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private timestamp() {
    return moment().format('YYYY/MM/DD HH:mm:ss');
  }
}

const stripCodeFence = (value: string) =>
  value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue : null;
};

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const numericValue = Number(value.replace(/,/g, '').trim());

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
};

const toNullableInteger = (value: unknown): number | null => {
  const numericValue = toNullableNumber(value);

  if (numericValue === null) {
    return null;
  }

  return Number.isInteger(numericValue) ? numericValue : null;
};

const sumNullableNumbers = (...values: Array<number | null>) => {
  const numericValues = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );

  if (!numericValues.length) {
    return null;
  }

  return numericValues.reduce((total, value) => total + value, 0);
};

const normalizeInvoiceDate = (dateText: string | null) => {
  if (!dateText) {
    return null;
  }

  const raw = String(dateText).trim();

  if (!raw) {
    return null;
  }

  const nowYear = new Date().getFullYear();
  const normalized = raw.replace(/-/g, '/').replace(/[.\s]+/g, '/');
  const parts = normalized.split('/').filter(Boolean);

  let year: number;
  let month: number;
  let day: number;

  if (parts.length === 3) {
    const [first, second, third] = parts;

    if (
      first.length === 4 &&
      Number.isFinite(Number(first)) &&
      Number.isFinite(Number(second)) &&
      Number.isFinite(Number(third))
    ) {
      year = Number(first);
      month = Number(second);
      day = Number(third);
    } else if (
      third.length === 4 &&
      Number.isFinite(Number(first)) &&
      Number.isFinite(Number(second)) &&
      Number.isFinite(Number(third))
    ) {
      day = Number(first);
      month = Number(second);
      year = Number(third);
    } else {
      return null;
    }
  } else if (
    parts.length === 2 &&
    Number.isFinite(Number(parts[0])) &&
    Number.isFinite(Number(parts[1]))
  ) {
    day = Number(parts[0]);
    month = Number(parts[1]);
    year = nowYear;
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}`;
};

const normalizeCurrencyCode = (value: string | null) => {
  const normalizedValue = toNullableString(value);

  if (!normalizedValue) {
    return null;
  }

  const key = normalizedValue.toUpperCase();
  const mappedValues: Record<string, string> = {
    RP: 'IDR',
    'RP.': 'IDR',
    RUPIAH: 'IDR',
    IDR: 'IDR',
    USD: 'USD',
    '$': 'USD',
    SGD: 'SGD',
    EUR: 'EUR',
  };

  return mappedValues[key] || key;
};

const roundSimilarityScore = (distance: number | null) => {
  if (distance === null || distance === undefined) {
    return null;
  }

  const similarity = 1 - Number(distance);

  if (!Number.isFinite(similarity)) {
    return null;
  }

  return Number(similarity.toFixed(6));
};

const isPdfFile = (key: string, contentType: string | null) => {
  if (contentType === 'application/pdf') {
    return true;
  }

  return extname(key || '').toLowerCase() === '.pdf';
};

const sleep = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

const collapseLargeText = (value: string) =>
  value.replace(/\u0000/g, ' ').trim().slice(0, 15000);
