import axios from 'axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Customer } from './models/Customer';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { CreateCustomer } from './commands/CreateCustomer.service';
import {
  ImportMatchaPopCustomerDto,
  ImportMatchaPopCustomersDto,
} from './dtos/MatchaPopCustomers.dto';
import { CreateCustomerDto } from './dtos/CreateCustomer.dto';
import { TenancyContext } from '../Tenancy/TenancyContext.service';

type MatchaPopCustomer = {
  id: number;
  fullName?: string | null;
  company_name?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  CustomerContact?: {
    contactNo?: string | null;
    email?: string | null;
    City?: {
      name?: string | null;
      Province?: {
        name?: string | null;
      } | null;
    } | null;
  } | null;
};

@Injectable()
export class CustomersMatchaPopSyncService {
  private static readonly MATCHA_POP_CUSTOMERS_URL =
    'https://api.matchapop.id/customers';

  constructor(
    private readonly createCustomerService: CreateCustomer,
    private readonly tenancyContext: TenancyContext,

    @Inject(Customer.name)
    private readonly customerModel: TenantModelProxy<typeof Customer>,
  ) {}

  private normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeEmail(value: unknown): string {
    const email = this.normalizeText(value);
    return email.includes('@') ? email : '';
  }

  private buildLastName(customer: MatchaPopCustomer): string {
    return [
      this.normalizeText(customer.middleName),
      this.normalizeText(customer.lastName),
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private buildDisplayName(
    companyName: string,
    firstName: string,
    lastName: string,
    fullName: string,
  ) {
    return (
      companyName ||
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      fullName
    );
  }

  private normalizeCustomer(customer: MatchaPopCustomer) {
    const companyName = this.normalizeText(customer.company_name);
    const firstName = this.normalizeText(customer.firstName);
    const lastName = this.buildLastName(customer);
    const fullName = this.normalizeText(customer.fullName);
    const displayName = this.buildDisplayName(
      companyName,
      firstName,
      lastName,
      fullName,
    );

    return {
      externalId: Number(customer.id),
      companyName,
      firstName,
      lastName,
      displayName,
      workPhone: this.normalizeText(customer.CustomerContact?.contactNo),
      email: this.normalizeEmail(customer.CustomerContact?.email),
      billingAddressCity: this.normalizeText(customer.CustomerContact?.City?.name),
      billingAddressState: this.normalizeText(
        customer.CustomerContact?.City?.Province?.name,
      ),
    };
  }

  private isImportableCustomer(customer: {
    externalId: number;
    firstName: string;
    displayName: string;
  }) {
    return (
      Number.isFinite(customer.externalId) &&
      customer.externalId > 0 &&
      Boolean(customer.firstName) &&
      Boolean(customer.displayName)
    );
  }

  private async fetchCustomers(): Promise<MatchaPopCustomer[]> {
    const customers: MatchaPopCustomer[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    const perPage = 100;

    try {
      while (customers.length < total) {
        const response = await axios.get(
          CustomersMatchaPopSyncService.MATCHA_POP_CUSTOMERS_URL,
          {
            params: {
              per_page: perPage,
              page,
            },
            timeout: 15000,
          },
        );

        const payload = response.data?.Customers || {};
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        total = Number(payload.count ?? rows.length);

        if (rows.length === 0) {
          break;
        }

        customers.push(...rows);
        page += 1;
      }

      return customers;
    } catch (error) {
      throw new ServiceError(
        'MATCHAPOP_CUSTOMERS_FETCH_FAILED',
        'Failed to fetch customers from MatchaPop.',
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
    const query = this.customerModel()
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

  private buildCreateCustomerDto(
    customer: ImportMatchaPopCustomerDto,
    currencyCode: string,
    code?: string,
  ): CreateCustomerDto {
    return {
      externalId: customer.externalId,
      customerType: 'individual',
      currencyCode,
      firstName: customer.firstName,
      lastName: customer.lastName || '',
      companyName: customer.companyName || '',
      displayName: customer.displayName,
      code,
      email: customer.email || '',
      workPhone: customer.workPhone || '',
      billingAddressCity: customer.billingAddressCity || '',
      billingAddressState: customer.billingAddressState || '',
      active: true,
    };
  }

  public async syncExistingCustomers() {
    const customers = await this.fetchCustomers();
    const normalizedCustomers = customers
      .map((customer) => this.normalizeCustomer(customer))
      .filter((customer) => this.isImportableCustomer(customer));

    const externalIds = normalizedCustomers
      .map((customer) => customer.externalId)
      .filter((externalId) => Number.isFinite(externalId));

    const existingCustomers = externalIds.length
      ? await this.customerModel().query().whereIn('externalId', externalIds)
      : [];

    const existingCustomersMap = new Map(
      existingCustomers.map((customer) => [Number(customer.externalId), customer]),
    );

    let updatedCount = 0;
    const updatedCustomerIds: number[] = [];

    for (const customer of normalizedCustomers) {
      const existingCustomer = existingCustomersMap.get(customer.externalId);

      if (!existingCustomer) {
        continue;
      }
      const availableCode = await this.getAvailableContactCode(
        customer.externalId,
        existingCustomer.id,
      );

      const patch = {
        firstName: customer.firstName,
        lastName: customer.lastName,
        companyName: customer.companyName || '',
        displayName: customer.displayName,
        contactType: 'individual',
        ...(availableCode ? { code: availableCode } : {}),
        workPhone: customer.workPhone || null,
        email: customer.email || null,
        billingAddressCity: customer.billingAddressCity || null,
        billingAddressState: customer.billingAddressState || null,
      };

      const hasChanges =
        this.normalizeText(existingCustomer.firstName) !== patch.firstName ||
        this.normalizeText(existingCustomer.lastName) !== patch.lastName ||
        this.normalizeText(existingCustomer.companyName) !== patch.companyName ||
        this.normalizeText(existingCustomer.displayName) !== patch.displayName ||
        this.normalizeText(existingCustomer.contactType) !== patch.contactType ||
        (typeof patch.code !== 'undefined' &&
          this.normalizeText(existingCustomer.code) !== patch.code) ||
        this.normalizeText(existingCustomer.workPhone) !==
          this.normalizeText(patch.workPhone) ||
        this.normalizeText(existingCustomer.email) !==
          this.normalizeText(patch.email) ||
        this.normalizeText(existingCustomer.billingAddressCity) !==
          this.normalizeText(patch.billingAddressCity) ||
        this.normalizeText(existingCustomer.billingAddressState) !==
          this.normalizeText(patch.billingAddressState);

      if (!hasChanges) {
        continue;
      }

      await this.customerModel().query().patchAndFetchById(existingCustomer.id, patch);

      updatedCount += 1;
      updatedCustomerIds.push(existingCustomer.id);
    }

    const importCandidates = normalizedCustomers.filter(
      (customer) => !existingCustomersMap.has(customer.externalId),
    );

    return {
      totalExternalCustomers: normalizedCustomers.length,
      updatedCount,
      updatedCustomerIds,
      importCandidates,
    };
  }

  public async importCustomers(dto: ImportMatchaPopCustomersDto) {
    const customers = Array.isArray(dto.customers) ? dto.customers : [];

    if (customers.length === 0) {
      return {
        createdCount: 0,
        createdIds: [],
        skippedExternalIds: [],
      };
    }

    const currencyCode = await this.getBaseCurrencyCode();
    const existingCustomers = await this.customerModel()
      .query()
      .whereIn(
        'externalId',
        customers.map((customer) => customer.externalId),
      );

    const existingExternalIds = new Set(
      existingCustomers.map((customer) => Number(customer.externalId)),
    );

    const createdIds: number[] = [];
    const skippedExternalIds: number[] = [];

    for (const customer of customers) {
      if (existingExternalIds.has(Number(customer.externalId))) {
        skippedExternalIds.push(Number(customer.externalId));
        continue;
      }

      const availableCode = await this.getAvailableContactCode(customer.externalId);
      const createCustomerDto = this.buildCreateCustomerDto(
        customer,
        currencyCode,
        availableCode,
      );
      const createdCustomer = await this.createCustomerService.createCustomer(
        createCustomerDto,
      );

      createdIds.push(createdCustomer.id);
      existingExternalIds.add(Number(customer.externalId));
    }

    return {
      createdCount: createdIds.length,
      createdIds,
      skippedExternalIds,
    };
  }
}
