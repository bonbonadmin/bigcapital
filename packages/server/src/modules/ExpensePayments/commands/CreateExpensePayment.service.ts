import { Knex } from 'knex';
import { Inject, Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { ExpensePayment } from '../models/ExpensePayment';
import { CreateExpensePaymentDto } from '../dtos/ExpensePayment.dto';
import { ExpensePaymentValidators } from './ExpensePaymentValidators.service';
import { CommandExpensePaymentDTOTransformer } from './CommandExpensePaymentDTOTransformer.service';
import { ExpensePaymentExpenseSync } from './ExpensePaymentExpenseSync.service';
import { ExpensePaymentGLEntries } from './ExpensePaymentGLEntries';

@Injectable()
export class CreateExpensePaymentService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validators: ExpensePaymentValidators,
    private readonly transformer: CommandExpensePaymentDTOTransformer,
    private readonly tenancyContext: TenancyContext,
    private readonly expenseSync: ExpensePaymentExpenseSync,
    private readonly glEntries: ExpensePaymentGLEntries,

    @Inject(Vendor.name)
    private readonly vendorModel: TenantModelProxy<typeof Vendor>,

    @Inject(ExpensePayment.name)
    private readonly expensePaymentModel: TenantModelProxy<typeof ExpensePayment>,
  ) {}

  public async createExpensePayment(
    paymentDTO: CreateExpensePaymentDto,
    trx?: Knex.Transaction,
  ): Promise<ExpensePayment> {
    const tenantMeta = await this.tenancyContext.getTenant(true);
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
    const paymentAccount = await this.validators.getPaymentAccountOrThrowError(
      expensePaymentObj.paymentAccountId,
    );
    if (expensePaymentObj.paymentNumber) {
      await this.validators.validatePaymentNumber(expensePaymentObj.paymentNumber);
    }
    await this.validators.validateExpensesDueAmount(expensePaymentObj.entries);
    this.validators.validateWithdrawalAccountCurrency(
      paymentAccount.currencyCode,
      currencyCode,
      tenantMeta.metadata.baseCurrency,
    );

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const expensePayment = await this.expensePaymentModel()
        .query(trx)
        .insertGraphAndFetch({
          ...expensePaymentObj,
        });

      await this.expenseSync.saveChangeExpensesPaymentAmount(
        expensePayment.entries.map((entry) => ({
          expenseId: entry.expenseId,
          paymentAmount: entry.paymentAmount,
        })),
        null,
        trx,
      );
      await this.glEntries.writePaymentGLEntries(expensePayment.id, trx);

      return expensePayment;
    }, trx);
  }
}
