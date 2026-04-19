import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ExpensePayment } from '../models/ExpensePayment';
import { ExpensePaymentEntry } from '../models/ExpensePaymentEntry';
import { ExpensePaymentExpenseSync } from './ExpensePaymentExpenseSync.service';
import { ExpensePaymentGLEntries } from './ExpensePaymentGLEntries';

@Injectable()
export class DeleteExpensePaymentService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly expenseSync: ExpensePaymentExpenseSync,
    private readonly glEntries: ExpensePaymentGLEntries,

    @Inject(ExpensePayment.name)
    private readonly expensePaymentModel: TenantModelProxy<typeof ExpensePayment>,

    @Inject(ExpensePaymentEntry.name)
    private readonly expensePaymentEntryModel: TenantModelProxy<
      typeof ExpensePaymentEntry
    >,
  ) {}

  public async deleteExpensePayment(expensePaymentId: number) {
    const oldExpensePayment = await this.expensePaymentModel()
      .query()
      .withGraphFetched('entries')
      .findById(expensePaymentId)
      .throwIfNotFound();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.expensePaymentEntryModel()
        .query(trx)
        .where('expense_payment_id', expensePaymentId)
        .delete();

      await this.expensePaymentModel()
        .query(trx)
        .where('id', expensePaymentId)
        .delete();

      await this.expenseSync.saveChangeExpensesPaymentAmount(
        oldExpensePayment.entries.map((entry) => ({
          expenseId: entry.expenseId,
          paymentAmount: 0,
        })),
        oldExpensePayment.entries,
        trx,
      );
      await this.glEntries.revertPaymentGLEntries(expensePaymentId, trx);
    });
  }
}
