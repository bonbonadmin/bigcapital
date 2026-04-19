import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { ACCOUNT_ROOT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import {
  ICreateTaxRateDTO,
  ITaxRateCreatedPayload,
  ITaxRateCreatingPayload,
} from '../TaxRates.types';
import { CommandTaxRatesValidators } from './CommandTaxRatesValidator.service';
import { TaxRateModel } from '../models/TaxRate.model';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CreateTaxRateDto } from '../dtos/TaxRate.dto';
import { ServiceError } from '@/modules/Items/ServiceError';

const ERRORS = {
  TAX_RATE_ACCOUNT_INVALID_TYPE: 'TAX_RATE_ACCOUNT_INVALID_TYPE',
};

@Injectable()
export class CreateTaxRate {
  /**
   * @param {EventEmitter2} eventEmitter - The event emitter.
   * @param {UnitOfWork} uow - The unit of work.
   * @param {CommandTaxRatesValidators} validators - The tax rates validators.
   * @param {typeof TaxRateModel} taxRateModel - The tax rate model.
   */
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly uow: UnitOfWork,
    private readonly validators: CommandTaxRatesValidators,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(TaxRateModel.name)
    private readonly taxRateModel: TenantModelProxy<typeof TaxRateModel>,
  ) {}

  private async validateAccount(accountId: number, trx?: Knex.Transaction) {
    const account = await this.accountModel()
      .query(trx)
      .findById(accountId)
      .throwIfNotFound();

    if (
      !account.isRootType(ACCOUNT_ROOT_TYPE.ASSET) &&
      !account.isRootType(ACCOUNT_ROOT_TYPE.LIABILITY)
    ) {
      throw new ServiceError(ERRORS.TAX_RATE_ACCOUNT_INVALID_TYPE);
    }
  }

  /**
   * Creates a new tax rate.
   * @param {ICreateTaxRateDTO} createTaxRateDTO
   */
  public async createTaxRate(
    createTaxRateDTO: CreateTaxRateDto,
    trx?: Knex.Transaction,
  ) {
    // Validates the tax code uniquiness.
    await this.validators.validateTaxCodeUnique(createTaxRateDTO.code, trx);
    await this.validateAccount(createTaxRateDTO.accountId, trx);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onTaxRateCreating` event.
      await this.eventEmitter.emitAsync(events.taxRates.onCreating, {
        createTaxRateDTO,
        trx,
      } as ITaxRateCreatingPayload);

      const taxRate = await this.taxRateModel()
        .query(trx)
        .insertAndFetch({
          ...createTaxRateDTO,
        });

      // Triggers `onTaxRateCreated` event.
      await this.eventEmitter.emitAsync(events.taxRates.onCreated, {
        createTaxRateDTO,
        taxRate,
        trx,
      } as ITaxRateCreatedPayload);

      return taxRate;
    }, trx);
  }
}
