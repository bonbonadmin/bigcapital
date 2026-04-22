import axios from 'axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Vendor } from './models/Vendor';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { CreateVendorService } from './commands/CreateVendor.service';
import {
  ImportMatchaPopVendorDto,
  ImportMatchaPopVendorsDto,
} from './dtos/MatchaPopVendors.dto';
import { CreateVendorDto } from './dtos/CreateVendor.dto';
import { TenancyContext } from '../Tenancy/TenancyContext.service';

type MatchaPopVendor = {
  id: number;
  company_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  VendorContact?: {
    phone_number?: string | null;
    email?: string | null;
    address?: string | null;
    postal_code?: string | null;
    City?: {
      name?: string | null;
      Province?: {
        name?: string | null;
      } | null;
    } | null;
  } | null;
};

@Injectable()
export class VendorsMatchaPopSyncService {
  private static readonly MATCHA_POP_VENDORS_URL =
    'https://api.matchapop.id/vendors';

  constructor(
    private readonly createVendorService: CreateVendorService,
    private readonly tenancyContext: TenancyContext,

    @Inject(Vendor.name)
    private readonly vendorModel: TenantModelProxy<typeof Vendor>,
  ) {}

  private normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeEmail(value: unknown): string {
    const email = this.normalizeText(value);
    return email.includes('@') ? email : '';
  }

  private buildFirstName(vendor: MatchaPopVendor): string {
    return [
      this.normalizeText(vendor.first_name),
      this.normalizeText(vendor.middle_name),
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private buildDisplayName(companyName: string, firstName: string, lastName: string) {
    if (companyName) return companyName;
    return [firstName, lastName].filter(Boolean).join(' ').trim();
  }

  private normalizeVendor(vendor: MatchaPopVendor) {
    const companyName = this.normalizeText(vendor.company_name);
    const firstName = this.buildFirstName(vendor);
    const lastName = this.normalizeText(vendor.last_name);
    const displayName = this.buildDisplayName(companyName, firstName, lastName);

    return {
      externalId: Number(vendor.id),
      companyName,
      firstName,
      lastName,
      displayName,
      workPhone: this.normalizeText(vendor.VendorContact?.phone_number),
      email: this.normalizeEmail(vendor.VendorContact?.email),
      billingAddress1: this.normalizeText(vendor.VendorContact?.address),
      billingAddressCity: this.normalizeText(vendor.VendorContact?.City?.name),
      billingAddressState: this.normalizeText(
        vendor.VendorContact?.City?.Province?.name,
      ),
      billingAddressPostcode: this.normalizeText(
        vendor.VendorContact?.postal_code,
      ),
    };
  }

  private isImportableVendor(vendor: { externalId: number; displayName: string }) {
    return (
      Number.isFinite(vendor.externalId) &&
      vendor.externalId > 0 &&
      Boolean(vendor.displayName)
    );
  }

  private async fetchVendors(): Promise<MatchaPopVendor[]> {
    const vendors: MatchaPopVendor[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    const perPage = 100;

    try {
      while (vendors.length < total) {
        const response = await axios.get(
          VendorsMatchaPopSyncService.MATCHA_POP_VENDORS_URL,
          {
            params: {
              per_page: perPage,
              page,
            },
            timeout: 15000,
          },
        );

        const payload = response.data?.Vendors || {};
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        total = Number(payload.count ?? rows.length);

        if (rows.length === 0) break;

        vendors.push(...rows);
        page += 1;
      }

      return vendors;
    } catch (error) {
      throw new ServiceError(
        'MATCHAPOP_VENDORS_FETCH_FAILED',
        'Failed to fetch vendors from MatchaPop.',
        { cause: error?.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async getBaseCurrencyCode() {
    const tenant = await this.tenancyContext.getTenant(true);
    return tenant?.metadata?.baseCurrency || 'USD';
  }

  private async getAvailableContactCode(
    externalId: number,
    currentContactId?: number,
  ): Promise<string | undefined> {
    const code = `${externalId}`;
    const query = this.vendorModel()
      .query()
      .knex()
      .from('contacts')
      .where('code', code);

    if (currentContactId) {
      query.whereNot('id', currentContactId);
    }

    const existingContact = await query.first();

    return existingContact ? undefined : code;
  }

  private buildCreateVendorDto(
    vendor: ImportMatchaPopVendorDto,
    currencyCode: string,
    code?: string,
  ): CreateVendorDto {
    return {
      externalId: vendor.externalId,
      currencyCode,
      firstName: vendor.firstName || '',
      lastName: vendor.lastName || '',
      companyName: vendor.companyName || '',
      displayName: vendor.displayName,
      code,
      email: vendor.email || '',
      workPhone: vendor.workPhone || '',
      billingAddress1: vendor.billingAddress1 || '',
      billingAddressCity: vendor.billingAddressCity || '',
      billingAddressState: vendor.billingAddressState || '',
      billingAddressPostcode: vendor.billingAddressPostcode || '',
      active: true,
    };
  }

  public async syncExistingVendors() {
    const vendors = await this.fetchVendors();
    const normalizedVendors = vendors
      .map((vendor) => this.normalizeVendor(vendor))
      .filter((vendor) => this.isImportableVendor(vendor));

    const externalIds = normalizedVendors
      .map((vendor) => vendor.externalId)
      .filter((externalId) => Number.isFinite(externalId));

    const existingVendors = externalIds.length
      ? await this.vendorModel().query().whereIn('externalId', externalIds)
      : [];
    const existingVendorsMap = new Map(
      existingVendors.map((vendor) => [Number(vendor.externalId), vendor]),
    );

    let updatedCount = 0;
    const updatedVendorIds: number[] = [];

    for (const vendor of normalizedVendors) {
      const existingVendor = existingVendorsMap.get(vendor.externalId);
      if (!existingVendor) continue;
      const availableCode = await this.getAvailableContactCode(
        vendor.externalId,
        existingVendor.id,
      );

      const patch = {
        companyName: vendor.companyName || null,
        firstName: vendor.firstName || null,
        lastName: vendor.lastName || null,
        displayName: vendor.displayName,
        ...(availableCode ? { code: availableCode } : {}),
        workPhone: vendor.workPhone || null,
        email: vendor.email || null,
        billingAddress1: vendor.billingAddress1 || null,
        billingAddressCity: vendor.billingAddressCity || null,
        billingAddressState: vendor.billingAddressState || null,
        billingAddressPostcode: vendor.billingAddressPostcode || null,
      };

      const hasChanges =
        this.normalizeText(existingVendor.companyName) !==
          this.normalizeText(patch.companyName) ||
        this.normalizeText(existingVendor.firstName) !==
          this.normalizeText(patch.firstName) ||
        this.normalizeText(existingVendor.lastName) !==
          this.normalizeText(patch.lastName) ||
        this.normalizeText(existingVendor.displayName) !==
          this.normalizeText(patch.displayName) ||
        (typeof patch.code !== 'undefined' &&
          this.normalizeText(existingVendor.code) !==
            this.normalizeText(patch.code)) ||
        this.normalizeText(existingVendor.workPhone) !==
          this.normalizeText(patch.workPhone) ||
        this.normalizeText(existingVendor.email) !==
          this.normalizeText(patch.email) ||
        this.normalizeText(existingVendor.billingAddress1) !==
          this.normalizeText(patch.billingAddress1) ||
        this.normalizeText(existingVendor.billingAddressCity) !==
          this.normalizeText(patch.billingAddressCity) ||
        this.normalizeText(existingVendor.billingAddressState) !==
          this.normalizeText(patch.billingAddressState) ||
        this.normalizeText(existingVendor.billingAddressPostcode) !==
          this.normalizeText(patch.billingAddressPostcode);

      if (!hasChanges) continue;

      await this.vendorModel().query().patchAndFetchById(existingVendor.id, patch);
      updatedCount += 1;
      updatedVendorIds.push(existingVendor.id);
    }

    const importCandidates = normalizedVendors.filter(
      (vendor) => !existingVendorsMap.has(vendor.externalId),
    );

    return {
      totalExternalVendors: normalizedVendors.length,
      updatedCount,
      updatedVendorIds,
      importCandidates,
    };
  }

  public async importVendors(dto: ImportMatchaPopVendorsDto) {
    const vendors = Array.isArray(dto.vendors) ? dto.vendors : [];

    if (vendors.length === 0) {
      return {
        createdCount: 0,
        createdIds: [],
        skippedExternalIds: [],
      };
    }

    const currencyCode = await this.getBaseCurrencyCode();
    const existingVendors = await this.vendorModel()
      .query()
      .whereIn(
        'externalId',
        vendors.map((vendor) => vendor.externalId),
      );

    const existingExternalIds = new Set(
      existingVendors.map((vendor) => Number(vendor.externalId)),
    );

    const createdIds: number[] = [];
    const skippedExternalIds: number[] = [];

    for (const vendor of vendors) {
      if (existingExternalIds.has(Number(vendor.externalId))) {
        skippedExternalIds.push(Number(vendor.externalId));
        continue;
      }

      const availableCode = await this.getAvailableContactCode(vendor.externalId);
      const createVendorDto = this.buildCreateVendorDto(
        vendor,
        currencyCode,
        availableCode,
      );
      const createdVendor = await this.createVendorService.createVendor(createVendorDto);

      createdIds.push(createdVendor.id);
      existingExternalIds.add(Number(vendor.externalId));
    }

    return {
      createdCount: createdIds.length,
      createdIds,
      skippedExternalIds,
    };
  }
}
