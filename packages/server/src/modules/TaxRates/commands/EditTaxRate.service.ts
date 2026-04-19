import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { omit } from 'lodash';
import { ACCOUNT_ROOT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import {
  IEditTaxRateDTO,
  ITaxRateEditedPayload,
  ITaxRateEditingPayload,
} from '../TaxRates.types';
import { CommandTaxRatesValidators } from './CommandTaxRatesValidator.service';
import { TaxRateModel } from '../models/TaxRate.model';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { events } from '@/common/events/events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { EditTaxRateDto } from '../dtos/TaxRate.dto';
import { ServiceError } from '@/modules/Items/ServiceError';

const ERRORS = {
  TAX_RATE_ACCOUNT_INVALID_TYPE: 'TAX_RATE_ACCOUNT_INVALID_TYPE',
};

@Injectable()
export class EditTaxRateService {
  /**
   * @param {EventEmitter2} eventEmitter - The event emitter.
   * @param {UnitOfWork} uow - The unit of work.
   * @param {CommandTaxRatesValidators} validators - The tax rates validators.
   * @param {TenantModelProxy<typeof TaxRateModel>} taxRateModel - The tax rate model.
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
   * Determines whether the tax rate, name or code have been changed.
   * @param {ITaxRate} taxRate
   * @param {IEditTaxRateDTO} editTaxRateDTO
   * @returns {boolean}
   */
  private isTaxRateDTOChanged = (
    taxRate: TaxRateModel,
    editTaxRateDTO: EditTaxRateDto,
  ) => {
    return (
      taxRate.rate !== editTaxRateDTO.rate ||
      taxRate.name !== editTaxRateDTO.name ||
      taxRate.code !== editTaxRateDTO.code ||
      Number(taxRate.accountId || 0) !== Number(editTaxRateDTO.accountId || 0)
    );
  };

  /**
   * Edits the given tax rate or creates a new if the rate or name have been changed.
   * @param {number} tenantId
   * @param {ITaxRate} oldTaxRate
   * @param {IEditTaxRateDTO} editTaxRateDTO
   * @param {Knex.Transaction} trx
   * @returns {Promise<ITaxRate>}
   */
  private async editTaxRateOrCreate(
    oldTaxRate: TaxRateModel,
    editTaxRateDTO: EditTaxRateDto,
    trx?: Knex.Transaction,
  ) {
    const isTaxDTOChanged = this.isTaxRateDTOChanged(
      oldTaxRate,
      editTaxRateDTO,
    );
    if (isTaxDTOChanged) {
      // Soft deleting the old tax rate.
      await this.taxRateModel().query(trx).findById(oldTaxRate.id).delete();

      // Create a new tax rate with new edited data.
      return this.taxRateModel()
        .query(trx)
        .insertAndFetch({
          ...omit(oldTaxRate, ['id']),
          ...editTaxRateDTO,
        });
    } else {
      return this.taxRateModel()
        .query(trx)
        .patchAndFetchById(oldTaxRate.id, {
          ...editTaxRateDTO,
        });
    }
  }

  /**
   * Edits the given tax rate.
   * @param {number} taxRateId - The tax rate id.
   * @param {IEditTaxRateDTO} editTaxRateDTO - The tax rate data to edit.
   * @returns {Promise<ITaxRate>}
   */
  public async editTaxRate(taxRateId: number, editTaxRateDTO: EditTaxRateDto) {
    const oldTaxRate = await this.taxRateModel().query().findById(taxRateId);

    // Validates the tax rate existance.
    this.validators.validateTaxRateExistance(oldTaxRate);
    await this.validateAccount(editTaxRateDTO.accountId);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onTaxRateEditing` event.
      await this.eventEmitter.emitAsync(events.taxRates.onEditing, {
        editTaxRateDTO,
        trx,
      } as ITaxRateEditingPayload);

      const taxRate = await this.editTaxRateOrCreate(
        oldTaxRate,
        editTaxRateDTO,
        trx,
      );
      // Triggers `onTaxRateEdited` event.
      await this.eventEmitter.emitAsync(events.taxRates.onEdited, {
        editTaxRateDTO,
        oldTaxRate,
        taxRate,
        trx,
      } as ITaxRateEditedPayload);

      return taxRate;
    });
  }
}
