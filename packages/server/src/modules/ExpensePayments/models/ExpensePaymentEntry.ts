import { Model } from 'objection';
import { BaseModel } from '@/models/Model';
import { Expense } from '@/modules/Expenses/models/Expense.model';
import { ExpensePayment } from './ExpensePayment';

export class ExpensePaymentEntry extends BaseModel {
  expensePaymentId: number;
  expenseId: number;
  paymentAmount: number;
  index: number;

  expense?: Expense;
  payment?: ExpensePayment;

  static get tableName() {
    return 'expense_payments_entries';
  }

  get timestamps() {
    return [];
  }

  static get relationMappings() {
    const { Expense } = require('../../Expenses/models/Expense.model');
    const { ExpensePayment } = require('./ExpensePayment');

    return {
      payment: {
        relation: Model.BelongsToOneRelation,
        modelClass: ExpensePayment,
        join: {
          from: 'expense_payments_entries.expensePaymentId',
          to: 'expense_payments.id',
        },
      },
      expense: {
        relation: Model.BelongsToOneRelation,
        modelClass: Expense,
        join: {
          from: 'expense_payments_entries.expenseId',
          to: 'expenses_transactions.id',
        },
      },
    };
  }
}
