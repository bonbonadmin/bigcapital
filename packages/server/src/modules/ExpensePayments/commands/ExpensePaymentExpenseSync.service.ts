import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import Objection, { ModelObject } from 'objection';
import { entriesAmountDiff } from '@/utils/entries-amount-diff';
import { Expense } from '@/modules/Expenses/models/Expense.model';
import { ExpensePaymentEntryDto } from '../dtos/ExpensePayment.dto';
import { ExpensePaymentEntry } from '../models/ExpensePaymentEntry';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

@Injectable()
export class ExpensePaymentExpenseSync {
  constructor(
    @Inject(Expense.name)
    private readonly expense: TenantModelProxy<typeof Expense>,
  ) {}

  public async saveChangeExpensesPaymentAmount(
    paymentEntries: ExpensePaymentEntryDto[],
    oldPaymentEntries?: ModelObject<ExpensePaymentEntry>[],
    trx?: Knex.Transaction,
  ): Promise<void> {
    const opers: Objection.QueryBuilder<Expense, Expense[]>[] = [];

    const diffEntries = entriesAmountDiff(
      paymentEntries,
      oldPaymentEntries,
      'paymentAmount',
      'expenseId',
    );
    diffEntries.forEach(
      (diffEntry: { paymentAmount: number; expenseId: number }) => {
        if (diffEntry.paymentAmount === 0) {
          return;
        }
        opers.push(
          this.expense().changePaymentAmount(
            diffEntry.expenseId,
            diffEntry.paymentAmount,
            trx,
          ),
        );
      },
    );
    await Promise.all(opers);
  }
}
