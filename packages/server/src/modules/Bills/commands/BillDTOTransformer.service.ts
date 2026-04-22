import { Inject, Injectable } from '@nestjs/common';
import { omit, sumBy } from 'lodash';
import * as moment from 'moment';
import * as R from 'ramda';
import * as composeAsync from 'async/compose';
import { formatDateFields } from '@/utils/format-date-fields';
import { BranchTransactionDTOTransformer } from '@/modules/Branches/integrations/BranchTransactionDTOTransform';
import { WarehouseTransactionDTOTransform } from '@/modules/Warehouses/Integrations/WarehouseTransactionDTOTransform';
import { ItemEntry } from '@/modules/TransactionItemEntry/models/ItemEntry';
import { Item } from '@/modules/Items/models/Item';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { ACCOUNT_ROOT_TYPE } from '@/constants/accounts';
import { AccountRepository } from '@/modules/Accounts/repositories/Account.repository';
import { ItemEntriesTaxTransactions } from '@/modules/TaxRates/ItemEntriesTaxTransactions.service';
import { Bill } from '../models/Bill';
import { assocItemEntriesDefaultIndex } from '@/utils/associate-item-entries-index';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CreateBillDto } from '../dtos/Bill.dto';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../Bills.constants';
import { TaxRateModel } from '@/modules/TaxRates/models/TaxRate.model';
import { isInventoryTrackedItemType } from '@/modules/Items/Items.constants';
import { WithholdingTax } from '@/modules/WithholdingTaxes/models/WithholdingTax.model';

@Injectable()
export class BillDTOTransformer {
  constructor(
    private branchDTOTransform: BranchTransactionDTOTransformer,
    private warehouseDTOTransform: WarehouseTransactionDTOTransform,
    private taxDTOTransformer: ItemEntriesTaxTransactions,
    private tenancyContext: TenancyContext,
    private accountRepository: AccountRepository,

    @Inject(ItemEntry.name)
    private itemEntryModel: TenantModelProxy<typeof ItemEntry>,

    @Inject(Item.name) private itemModel: TenantModelProxy<typeof Item>,

    @Inject(Account.name)
    private accountModel: TenantModelProxy<typeof Account>,

    @Inject(TaxRateModel.name)
    private taxRateModel: TenantModelProxy<typeof TaxRateModel>,

    @Inject(WithholdingTax.name)
    private withholdingTaxModel: TenantModelProxy<typeof WithholdingTax>,
  ) {}

  private getBillDiscountAmount(
    amount: number,
    discountType: string,
    discount: number | undefined,
  ): number {
    const normalizedDiscount = Number(discount) || 0;

    return discountType === 'percentage'
      ? (amount * normalizedDiscount) / 100
      : normalizedDiscount;
  }

  private getBillSalesTaxBaseAmount(
    amount: number,
    discountType: string,
    discount: number | undefined,
    adjustment: number | undefined,
  ): number {
    const discountAmount = this.getBillDiscountAmount(
      amount,
      discountType,
      discount,
    );
    const baseAmount = amount - discountAmount + (Number(adjustment) || 0);

    return Math.max(baseAmount, 0);
  }

  private async resolveSalesTaxSnapshot(billDTO: CreateBillDto, amount: number) {
    if (!billDTO.salesTaxRateId) {
      return null;
    }
    const salesTaxRate = await this.taxRateModel()
      .query()
      .findById(billDTO.salesTaxRateId)
      .throwIfNotFound();

    if (!salesTaxRate.accountId) {
      throw new ServiceError(ERRORS.SALES_TAX_ACCOUNT_HAS_INVALID_TYPE);
    }
    const salesTaxAccount = await this.accountModel()
      .query()
      .findById(salesTaxRate.accountId)
      .throwIfNotFound();

    if (
      !salesTaxAccount.isRootType(ACCOUNT_ROOT_TYPE.ASSET) &&
      !salesTaxAccount.isRootType(ACCOUNT_ROOT_TYPE.LIABILITY)
    ) {
      throw new ServiceError(ERRORS.SALES_TAX_ACCOUNT_HAS_INVALID_TYPE);
    }
    const baseAmount = this.getBillSalesTaxBaseAmount(
      amount,
      billDTO.discountType,
      billDTO.discount,
      billDTO.adjustment,
    );
    const rate = Number(salesTaxRate.rate) || 0;
    const salesTaxAmount = Number(((baseAmount * rate) / 100).toFixed(3));

    return {
      salesTaxRateId: salesTaxRate.id,
      salesTaxName: salesTaxRate.name,
      salesTaxRate: rate,
      salesTaxAccountId: salesTaxRate.accountId,
      salesTaxAmount,
    };
  }

  private async resolveWithholdingTaxSnapshot(
    billDTO: CreateBillDto,
    amount: number,
  ) {
    if (!billDTO.withholdingTaxId) {
      return null;
    }
    const withholdingTax = await this.withholdingTaxModel()
      .query()
      .findById(billDTO.withholdingTaxId)
      .throwIfNotFound();

    const withholdingTaxAccount = await this.accountModel()
      .query()
      .findById(withholdingTax.accountId)
      .throwIfNotFound();

    if (
      !withholdingTaxAccount.isRootType(ACCOUNT_ROOT_TYPE.ASSET) &&
      !withholdingTaxAccount.isRootType(ACCOUNT_ROOT_TYPE.LIABILITY)
    ) {
      throw new ServiceError(ERRORS.WITHHOLDING_TAX_ACCOUNT_HAS_INVALID_TYPE);
    }
    const baseAmount = this.getBillSalesTaxBaseAmount(
      amount,
      billDTO.discountType,
      billDTO.discount,
      billDTO.adjustment,
    );
    const rate = Number(withholdingTax.rate) || 0;
    const withholdingTaxAmount = Number(((baseAmount * rate) / 100).toFixed(3));

    return {
      withholdingTaxId: withholdingTax.id,
      withholdingTaxName: withholdingTax.name,
      withholdingTaxRate: rate,
      withholdingTaxAccountId: withholdingTax.accountId,
      withholdingTaxAmount,
    };
  }

  private async resolvePayableAccountId(
    payableAccountId: number | undefined,
    vendorCurrencyCode: string,
    oldBill?: Bill,
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
    if (oldBill?.payableAccountId) {
      return oldBill.payableAccountId;
    }
    const payableAccount =
      await this.accountRepository.findOrCreateAccountsPayable(
        vendorCurrencyCode,
      );

    return payableAccount.id;
  }

  /**
   * Retrieve the bill entries total.
   * @param {IItemEntry[]} entries
   * @returns {number}
   */
  private getBillEntriesTotal(entries: ItemEntry[]): number {
    return sumBy(entries, (e) => this.itemEntryModel().calcAmount(e));
  }

  /**
   * Retrieve the bill landed cost amount.
   * @param {CreateBillDto} billDTO
   * @returns {number}
   */
  private getBillLandedCostAmount(billDTO: CreateBillDto): number {
    const costEntries = billDTO.entries.filter((entry) => entry.landedCost);

    // return this.getBillEntriesTotal(costEntries);

    return 0;
  }

  /**
   * Converts create bill DTO to model.
   * @param {IBillDTO} billDTO
   * @param {IBill} oldBill
   * @returns {IBill}
   */
  public async billDTOToModel(
    billDTO: CreateBillDto,
    vendor: Vendor,
    oldBill?: Bill,
  ): Promise<Bill> {
    const amount = sumBy(billDTO.entries, (e) =>
      this.itemEntryModel().calcAmount(e),
    );
    const payableAccountId = await this.resolvePayableAccountId(
      billDTO.payableAccountId,
      vendor.currencyCode,
      oldBill,
    );
    const salesTaxSnapshot = await this.resolveSalesTaxSnapshot(billDTO, amount);
    const withholdingTaxSnapshot = await this.resolveWithholdingTaxSnapshot(
      billDTO,
      amount,
    );
    // Retrieve the landed cost amount from landed cost entries.
    const landedCostAmount = this.getBillLandedCostAmount(billDTO);

    // Retrieve the authorized user.
    const authorizedUser = await this.tenancyContext.getSystemUser();

    // Bill number from DTO or frprom auto-increment.
    const billNumber = billDTO.billNumber || oldBill?.billNumber;

    const initialEntries = billDTO.entries.map((entry) => ({
      referenceType: 'Bill',
      isInclusiveTax: billDTO.isInclusiveTax,
      ...omit(entry, ['amount']),
    }));
    const asyncEntries = await composeAsync(
      // Associate tax rate from tax id to entries.
      this.taxDTOTransformer.assocTaxRateFromTaxIdToEntries,
      // Associate tax rate id from tax code to entries.
      this.taxDTOTransformer.assocTaxRateIdFromCodeToEntries,
      // Sets the default cost account to the bill entries.
      this.setBillEntriesDefaultAccounts(),
    )(initialEntries);

    const entries = R.compose(
      // Remove tax code from entries.
      R.map(R.omit(['taxCode'])),
      // Associate the default index to each item entry line.
      assocItemEntriesDefaultIndex,
    )(asyncEntries);

    const initialDTO = {
      ...formatDateFields(omit(billDTO, ['open', 'entries', 'attachments']), [
        'billDate',
        'dueDate',
      ]),
      amount,
      landedCostAmount,
      currencyCode: vendor.currencyCode,
      exchangeRate: billDTO.exchangeRate || 1,
      billNumber,
      payableAccountId,
      ...(salesTaxSnapshot || {
        salesTaxRateId: null,
        salesTaxName: null,
        salesTaxRate: null,
        salesTaxAccountId: null,
        salesTaxAmount: 0,
      }),
      ...(withholdingTaxSnapshot || {
        withholdingTaxId: null,
        withholdingTaxName: null,
        withholdingTaxRate: null,
        withholdingTaxAccountId: null,
        withholdingTaxAmount: 0,
      }),
      entries,
      // Avoid rewrite the open date in edit mode when already opened.
      ...(billDTO.open &&
        !oldBill?.openedAt && {
          openedAt: moment().toMySqlDateTime(),
        }),
      userId: authorizedUser.id,
    };

    const asyncDto = await composeAsync(
      this.branchDTOTransform.transformDTO<Bill>,
      this.warehouseDTOTransform.transformDTO<Bill>,
    )(initialDTO);

    return R.compose(
      // Associates tax amount withheld to the model.
      this.taxDTOTransformer.assocTaxAmountWithheldFromEntries,
    )(asyncDto) as Bill;
  }

  /**
   * Sets the default cost account to the bill entries.
   */
  private setBillEntriesDefaultAccounts() {
    return async (entries: ItemEntry[]) => {
      const entriesItemsIds = entries.map((e) => e.itemId);
      const items = await this.itemModel()
        .query()
        .whereIn('id', entriesItemsIds);

      return entries.map((entry) => {
        const item = items.find((i) => i.id === entry.itemId);

        return {
          ...entry,
          ...(!isInventoryTrackedItemType(item.type) && {
            costAccountId: entry.costAccountId || item.costAccountId,
          }),
        };
      });
    };
  }
}
