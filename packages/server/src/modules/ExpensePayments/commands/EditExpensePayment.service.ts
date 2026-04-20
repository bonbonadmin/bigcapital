import { Knex } from 'knex';
import { Inject, Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { ExpensePayment } from '../models/ExpensePayment';
import { EditExpensePaymentDto } from '../dtos/ExpensePayment.dto';
import { ExpensePaymentValidators } from './ExpensePaymentValidators.service';
import { CommandExpensePaymentDTOTransformer } from './CommandExpensePaymentDTOTransformer.service';
import { ExpensePaymentExpenseSync } from './ExpensePaymentExpenseSync.service';
import { ExpensePaymentGLEntries } from './ExpensePaymentGLEntries';

@Injectable()
export class EditExpensePaymentService {
  constructor(
    private readonly validators: ExpensePaymentValidators,
    private readonly uow: UnitOfWork,
    private readonly transformer: CommandExpensePaymentDTOTransformer,
    private readonly tenancyContext: TenancyContext,
    private readonly expenseSync: ExpensePaymentExpenseSync,
    private readonly glEntries: ExpensePaymentGLEntries,

    @Inject(ExpensePayment.name)
    private readonly expensePaymentModel: TenantModelProxy<typeof ExpensePayment>,

    @Inject(Vendor.name)
    private readonly vendorModel: TenantModelProxy<typeof Vendor>,
  ) {}

  public async editExpensePayment(
    expensePaymentId: number,
    paymentDTO: EditExpensePaymentDto,
  ): Promise<ExpensePayment> {
    const tenantMeta = await this.tenancyContext.getTenant(true);
    const oldExpensePayment = await this.expensePaymentModel()
      .query()
      .findById(expensePaymentId)
      .withGraphFetched('entries')
      .throwIfNotFound();
    const oldExpensePaymentSnapshot = {
      ...oldExpensePayment,
      entries: (oldExpensePayment.entries || []).map((entry) => ({
        ...entry,
      })),
    } as ExpensePayment;

    const vendor = await this.vendorModel()
      .query()
      .findById(paymentDTO.vendorId)
      .throwIfNotFound();

    const expenses = await this.validators.validateExpensesExistance(
      paymentDTO.entries,
      paymentDTO.vendorId,
    );
    const payableAccountId =
      await this.validators.getPayableAccountIdFromExpensesOrThrowError(
        expenses,
      );
    const currencyCode =
      this.validators.getCurrencyCodeFromExpensesOrThrowError(expenses);
    const expensePaymentObj = await this.transformer.transformDTOToModel(
      paymentDTO,
      vendor,
      payableAccountId,
      currencyCode,
    );

    this.validators.validateVendorNotModified(paymentDTO, oldExpensePayment);
    const paymentAccount = await this.validators.getPaymentAccountOrThrowError(
      expensePaymentObj.paymentAccountId,
    );
    await this.validators.validateEntriesIdsExistance(
      expensePaymentId,
      expensePaymentObj.entries,
    );
    await this.validators.validateExpensesDueAmount(
      expensePaymentObj.entries,
      oldExpensePaymentSnapshot.entries,
    );
    if (expensePaymentObj.paymentNumber) {
      await this.validators.validatePaymentNumber(
        expensePaymentObj.paymentNumber,
        expensePaymentId,
      );
    }
    this.validators.validateWithdrawalAccountCurrency(
      paymentAccount.currencyCode,
      currencyCode,
      tenantMeta.metadata.baseCurrency,
    );

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const expensePayment = await this.expensePaymentModel()
        .query(trx)
        .upsertGraphAndFetch({
          id: expensePaymentId,
          ...expensePaymentObj,
        });

      await this.expenseSync.saveChangeExpensesPaymentAmount(
        (paymentDTO.entries || []).map((entry) => ({
          expenseId: entry.expenseId,
          paymentAmount: entry.paymentAmount,
        })),
        oldExpensePaymentSnapshot.entries,
        trx,
      );
      await this.glEntries.rewritePaymentGLEntries(expensePaymentId, trx);

      return expensePayment;
    });
  }
}
