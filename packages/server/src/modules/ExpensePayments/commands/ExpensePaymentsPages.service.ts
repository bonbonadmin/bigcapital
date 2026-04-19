import { omit } from 'lodash';
import { Inject, Injectable } from '@nestjs/common';
import { Expense } from '@/modules/Expenses/models/Expense.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ExpensePayment } from '../models/ExpensePayment';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';

@Injectable()
export class ExpensePaymentsPages {
  constructor(
    @Inject(Expense.name)
    private readonly expenseModel: TenantModelProxy<typeof Expense>,

    @Inject(ExpensePayment.name)
    private readonly expensePaymentModel: TenantModelProxy<typeof ExpensePayment>,
  ) {}

  public async getExpensePaymentEditPage(expensePaymentId: number): Promise<{
    expensePayment: Omit<ExpensePayment, 'entries'>;
    entries: any[];
  }> {
    const expensePayment = await this.expensePaymentModel()
      .query()
      .findById(expensePaymentId)
      .withGraphFetched('entries.expense');

    if (!expensePayment) {
      throw new ServiceError(ERRORS.PAYMENT_NOT_FOUND);
    }
    const paymentEntries = expensePayment.entries.map((entry) => ({
      ...this.mapExpenseToPageEntry(entry.expense),
      dueAmount: entry.expense.dueAmount + entry.paymentAmount,
      paymentAmount: entry.paymentAmount,
      id: entry.id,
    }));

    const restPayableExpenses = await this.expenseModel()
      .query()
      .modify('opened')
      .modify('dueExpenses')
      .where('payee_id', expensePayment.vendorId)
      .whereNotIn(
        'id',
        expensePayment.entries.map((e) => e.expenseId),
      )
      .orderBy('payment_date', 'ASC');

    return {
      expensePayment: omit(expensePayment, ['entries']),
      entries: [
        ...paymentEntries,
        ...restPayableExpenses.map(this.mapExpenseToPageEntry),
      ],
    };
  }

  public async getNewPageEntries(vendorId: number): Promise<any[]> {
    const payableExpenses = await this.expenseModel()
      .query()
      .modify('opened')
      .modify('dueExpenses')
      .where('payee_id', vendorId)
      .orderBy('payment_date', 'ASC');

    return payableExpenses.map(this.mapExpenseToPageEntry);
  }

  private mapExpenseToPageEntry(expense: Expense) {
    return {
      expenseId: expense.id,
      referenceNo: expense.referenceNo,
      amount: expense.totalAmount,
      dueAmount: expense.dueAmount,
      totalPaymentAmount: expense.paymentAmount,
      paymentAmount: '',
      currencyCode: expense.currencyCode,
      date: expense.paymentDate,
    };
  }
}
