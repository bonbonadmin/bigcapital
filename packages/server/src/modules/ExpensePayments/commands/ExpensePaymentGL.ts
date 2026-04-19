import * as moment from 'moment';
import { sumBy } from 'lodash';
import { AccountNormal } from '@/interfaces/Account';
import { ILedgerEntry } from '@/modules/Ledger/types/Ledger.types';
import { Ledger } from '@/modules/Ledger/Ledger';
import { ExpensePayment } from '../models/ExpensePayment';

export class ExpensePaymentGL {
  private expensePayment: ExpensePayment;
  private APAccountId: number;
  private gainLossAccountId: number;
  private baseCurrency: string;

  constructor(expensePayment: ExpensePayment) {
    this.expensePayment = expensePayment;
  }

  setAPAccountId(APAccountId: number) {
    this.APAccountId = APAccountId;
    return this;
  }

  setGainLossAccountId(gainLossAccountId: number) {
    this.gainLossAccountId = gainLossAccountId;
    return this;
  }

  setBaseCurrency(baseCurrency: string) {
    this.baseCurrency = baseCurrency;
    return this;
  }

  private get paymentCommonEntry() {
    const formattedDate = moment(this.expensePayment.paymentDate).format(
      'YYYY-MM-DD',
    );

    return {
      debit: 0,
      credit: 0,

      exchangeRate: this.expensePayment.exchangeRate,
      currencyCode: this.expensePayment.currencyCode,

      transactionId: this.expensePayment.id,
      transactionType: 'ExpensePayment',

      transactionNumber: this.expensePayment.paymentNumber,
      referenceNumber: this.expensePayment.reference,

      date: formattedDate,
      createdAt: this.expensePayment.createdAt,

      branchId: this.expensePayment.branchId,
    };
  }

  private get paymentExGainOrLoss(): number {
    return sumBy(this.expensePayment.entries, (entry) => {
      const paymentLocalAmount =
        entry.paymentAmount * this.expensePayment.exchangeRate;
      const expensePayment = entry.paymentAmount * entry.expense.exchangeRate;

      return expensePayment - paymentLocalAmount;
    });
  }

  private get paymentExGainOrLossEntries(): ILedgerEntry[] {
    const commonEntry = this.paymentCommonEntry;
    const totalExGainOrLoss = this.paymentExGainOrLoss;
    const absExGainOrLoss = Math.abs(totalExGainOrLoss);

    return totalExGainOrLoss
      ? [
          {
            ...commonEntry,
            currencyCode: this.baseCurrency,
            exchangeRate: 1,
            credit: totalExGainOrLoss > 0 ? absExGainOrLoss : 0,
            debit: totalExGainOrLoss < 0 ? absExGainOrLoss : 0,
            accountId: this.gainLossAccountId,
            index: 2,
            indexGroup: 20,
            accountNormal: AccountNormal.DEBIT,
          },
          {
            ...commonEntry,
            currencyCode: this.baseCurrency,
            exchangeRate: 1,
            debit: totalExGainOrLoss > 0 ? absExGainOrLoss : 0,
            credit: totalExGainOrLoss < 0 ? absExGainOrLoss : 0,
            accountId: this.APAccountId,
            index: 3,
            accountNormal: AccountNormal.DEBIT,
          },
        ]
      : [];
  }

  private get paymentGLEntry(): ILedgerEntry {
    const commonEntry = this.paymentCommonEntry;

    return {
      ...commonEntry,
      credit: this.expensePayment.localAmount,
      accountId: this.expensePayment.paymentAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 2,
    };
  }

  private get paymentGLPayableEntry(): ILedgerEntry {
    const commonEntry = this.paymentCommonEntry;

    return {
      ...commonEntry,
      exchangeRate: this.expensePayment.exchangeRate,
      debit: this.expensePayment.localAmount,
      contactId: this.expensePayment.vendorId,
      accountId: this.APAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: 1,
    };
  }

  private get paymentGLEntries(): ILedgerEntry[] {
    return [
      this.paymentGLEntry,
      this.paymentGLPayableEntry,
      ...this.paymentExGainOrLossEntries,
    ];
  }

  public getExpensePaymentLedger(): Ledger {
    return new Ledger(this.paymentGLEntries);
  }
}
