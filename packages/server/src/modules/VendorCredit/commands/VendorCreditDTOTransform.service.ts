import * as moment from 'moment';
import { omit } from 'lodash';
import * as R from 'ramda';
import * as composeAsync from 'async/compose';
import { ERRORS } from '../constants';
import { ItemsEntriesService } from '@/modules/Items/ItemsEntries.service';
import { BranchTransactionDTOTransformer } from '@/modules/Branches/integrations/BranchTransactionDTOTransform';
import { WarehouseTransactionDTOTransform } from '@/modules/Warehouses/Integrations/WarehouseTransactionDTOTransform';
import { VendorCredit } from '../models/VendorCredit';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { AccountRepository } from '@/modules/Accounts/repositories/Account.repository';
import { assocItemEntriesDefaultIndex } from '@/utils/associate-item-entries-index';
import { formatDateFields } from '@/utils/format-date-fields';
import { VendorCreditAutoIncrementService } from './VendorCreditAutoIncrement.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import {
  CreateVendorCreditDto,
  EditVendorCreditDto,
  VendorCreditEntryDto,
} from '../dtos/VendorCredit.dto';

@Injectable()
export class VendorCreditDTOTransformService {
  /**
   * @param {ItemsEntriesService} itemsEntriesService - The items entries service.
   * @param {BranchTransactionDTOTransformer} branchDTOTransform - The branch transaction DTO transformer.
   * @param {WarehouseTransactionDTOTransform} warehouseDTOTransform - The warehouse transaction DTO transformer.
   * @param {VendorCreditAutoIncrementService} vendorCreditAutoIncrement - The vendor credit auto increment service.
   */
  constructor(
    private itemsEntriesService: ItemsEntriesService,
    private branchDTOTransform: BranchTransactionDTOTransformer,
    private warehouseDTOTransform: WarehouseTransactionDTOTransform,
    private vendorCreditAutoIncrement: VendorCreditAutoIncrementService,
    private accountRepository: AccountRepository,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) { }

  private async resolvePayableAccountId(
    payableAccountId: number | undefined,
    vendorCurrencyCode: string,
    oldVendorCredit?: VendorCredit,
  ): Promise<number> {
    if (payableAccountId) {
      const payableAccount = await this.accountModel()
        .query()
        .findById(payableAccountId);

      if (!payableAccount) {
        throw new ServiceError(ERRORS.PAYABLE_ACCOUNT_NOT_FOUND);
      }
      if (!payableAccount.isAccountType(ACCOUNT_TYPE.ACCOUNTS_PAYABLE)) {
        throw new ServiceError(
          ERRORS.PAYABLE_ACCOUNT_NOT_ACCOUNTS_PAYABLE_TYPE,
        );
      }
      return payableAccount.id;
    }
    if (oldVendorCredit?.payableAccountId) {
      return oldVendorCredit.payableAccountId;
    }
    const payableAccount =
      await this.accountRepository.findOrCreateAccountsPayable(
        vendorCurrencyCode,
      );

    return payableAccount.id;
  }

  /**
   * Transforms the credit/edit vendor credit DTO to model.
   * @param {IVendorCreditCreateDTO | IVendorCreditEditDTO} vendorCreditDTO
   * @param {string} vendorCurrencyCode -
   * @param {IVendorCredit} oldVendorCredit -
   * @returns {VendorCredit}
   */
  public transformCreateEditDTOToModel = async (
    vendorCreditDTO: CreateVendorCreditDto | EditVendorCreditDto,
    vendorCurrencyCode: string,
    oldVendorCredit?: VendorCredit,
  ): Promise<VendorCredit> => {
    // Calculates the total amount of items entries.
    const amount = this.itemsEntriesService.getTotalItemsEntries(
      vendorCreditDTO.entries,
    );
    const payableAccountId = await this.resolvePayableAccountId(
      vendorCreditDTO.payableAccountId,
      vendorCurrencyCode,
      oldVendorCredit,
    );
    const entries = R.compose(
      // Associate the default index to each item entry.
      assocItemEntriesDefaultIndex,

      // Associate the reference type to item entries.
      R.map((entry: VendorCreditEntryDto) => ({
        referenceType: 'VendorCredit',
        ...entry,
      })),
    )(vendorCreditDTO.entries);

    // Retreive the next vendor credit number.
    const autoNextNumber =
      await this.vendorCreditAutoIncrement.getNextCreditNumber();

    // Detarmines the credit note number.
    const vendorCreditNumber =
      vendorCreditDTO.vendorCreditNumber ||
      oldVendorCredit?.vendorCreditNumber ||
      autoNextNumber;

    const initialDTO = {
      ...formatDateFields(
        omit(vendorCreditDTO, ['open', 'attachments']),
        ['vendorCreditDate'],
      ),
      amount,
      currencyCode: vendorCurrencyCode,
      exchangeRate: vendorCreditDTO.exchangeRate || 1,
      vendorCreditNumber,
      payableAccountId,
      entries,
      ...(vendorCreditDTO.open &&
        !oldVendorCredit?.openedAt && {
        openedAt: moment().toMySqlDateTime(),
      }),
    };
    return composeAsync(
      this.branchDTOTransform.transformDTO<VendorCredit>,
      this.warehouseDTOTransform.transformDTO<VendorCredit>,
    )(initialDTO) as VendorCredit;
  };

  /**
   * Validate the credit note remaining amount.
   * @param {ICreditNote} creditNote
   * @param {number} amount
   */
  public validateCreditRemainingAmount = (
    vendorCredit: VendorCredit,
    amount: number,
  ) => {
    if (vendorCredit.creditsRemaining < amount) {
      throw new ServiceError(ERRORS.VENDOR_CREDIT_HAS_NO_REMAINING_AMOUNT);
    }
  };
}
