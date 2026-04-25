import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { chunk } from 'lodash';
import { Vendor } from '../Vendors/models/Vendor';
import { AccountTransaction } from '../Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { ContactEmbeddingsRepository } from './repositories/ContactEmbeddings.repository';
import { TransactionEmbeddingsRepository } from './repositories/TransactionEmbeddings.repository';
import { normalizeText, normalizeVendorName } from './utils/normalize';

@Injectable()
export class EmbeddingsSyncService {
  private readonly logger = new Logger(EmbeddingsSyncService.name);
  private readonly model: string;
  private readonly fetchBatchSize: number;
  private readonly embedBatchSize: number;
  private readonly apiKey?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly contactEmbeddingsRepository: ContactEmbeddingsRepository,
    private readonly transactionEmbeddingsRepository: TransactionEmbeddingsRepository,

    @Inject(Vendor.name)
    private readonly vendorModel: TenantModelProxy<typeof Vendor>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {
    this.apiKey = this.configService.get<string>('aiEmbeddings.apiKey');
    this.model = this.configService.get<string>(
      'aiEmbeddings.model',
      'text-embedding-3-large',
    );
    this.fetchBatchSize = this.configService.get<number>(
      'aiEmbeddings.fetchBatchSize',
      200,
    );
    this.embedBatchSize = this.configService.get<number>(
      'aiEmbeddings.embedBatchSize',
      64,
    );
  }

  async syncVendors() {
    await this.contactEmbeddingsRepository.ensureTable();

    let lastId = 0;
    let processedCount = 0;

    while (true) {
      const vendors = await this.vendorModel()
        .query()
        .select([
          'id',
          'company_name as companyName',
          'display_name as displayName',
          'first_name as firstName',
          'last_name as lastName',
        ])
        .where('id', '>', lastId)
        .orderBy('id', 'asc')
        .limit(this.fetchBatchSize);

      if (!vendors.length) {
        break;
      }

      const pendingContactIds =
        await this.contactEmbeddingsRepository.findPendingContactIds(
          vendors.map((vendor) => vendor.id),
        );
      const vendorsToEmbed = vendors.filter((vendor) =>
        pendingContactIds.has(vendor.id),
      );

      if (!vendorsToEmbed.length) {
        lastId = vendors[vendors.length - 1].id;
        continue;
      }

      const companyNames = vendorsToEmbed.map((vendor) =>
        normalizeVendorName(vendor.companyName),
      );
      const fullNames = vendorsToEmbed.map((vendor) =>
        normalizeVendorName(
          vendor.displayName ||
            [vendor.firstName, vendor.lastName].filter(Boolean).join(' '),
        ),
      );
      const companyNameEmbeddings = await this.embedTexts(companyNames);
      const fullNameEmbeddings = await this.embedTexts(fullNames);

      const rows = vendorsToEmbed.map((vendor, index) => ({
        contactId: vendor.id,
        companyNameEmbedding: companyNameEmbeddings[index],
        fullNameEmbedding: fullNameEmbeddings[index],
      }));

      await this.contactEmbeddingsRepository.upsertMany(rows);

      processedCount += rows.length;
      lastId = vendors[vendors.length - 1].id;
      this.logger.log(`Embedded ${processedCount} vendors so far.`);
    }

    return { processedCount };
  }

  async syncTransactions() {
    await this.transactionEmbeddingsRepository.ensureTable();

    let lastId = 0;
    let processedCount = 0;

    while (true) {
      const transactions = await this.accountTransactionModel()
        .query()
        .select(['id', 'note'])
        .where('id', '>', lastId)
        .whereNotNull('note')
        .whereRaw(`TRIM(COALESCE(note, '')) <> ''`)
        .orderBy('id', 'asc')
        .limit(this.fetchBatchSize);

      if (!transactions.length) {
        break;
      }

      const pendingTransactionIds =
        await this.transactionEmbeddingsRepository.findPendingTransactionIds(
          transactions.map((transaction) => transaction.id),
        );
      const transactionsToEmbed = transactions.filter((transaction) =>
        pendingTransactionIds.has(transaction.id),
      );

      if (!transactionsToEmbed.length) {
        lastId = transactions[transactions.length - 1].id;
        continue;
      }

      const normalizedNotes = transactionsToEmbed.map((transaction) =>
        normalizeText(transaction.note),
      );
      const noteEmbeddings = await this.embedTexts(normalizedNotes);

      await this.transactionEmbeddingsRepository.upsertMany(
        transactionsToEmbed.map((transaction, index) => ({
          transactionId: transaction.id,
          noteEmbedding: noteEmbeddings[index],
        })),
      );

      processedCount += transactionsToEmbed.length;
      lastId = transactions[transactions.length - 1].id;
      this.logger.log(`Embedded ${processedCount} transactions so far.`);
    }

    return { processedCount };
  }

  private async embedTexts(texts: string[]) {
    const client = this.getClient();
    const results = new Array(texts.length).fill(null);
    const indexedTexts = texts
      .map((text, index) => ({ text, index }))
      .filter((item) => item.text);

    for (const batch of chunk(indexedTexts, this.embedBatchSize)) {
      const response = await client.embeddings.create({
        model: this.model,
        input: batch.map((item) => item.text),
      });

      response.data.forEach((item, batchIndex) => {
        results[batch[batchIndex].index] = item.embedding;
      });
    }

    return results;
  }

  private getClient() {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    return new OpenAI({ apiKey: this.apiKey });
  }
}
