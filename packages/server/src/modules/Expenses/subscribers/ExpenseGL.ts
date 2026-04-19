import * as R from 'ramda';
import { ILedger } from '@/modules/Ledger/types/Ledger.types';
import { AccountNormal } from '@/modules/Accounts/Accounts.types';
import { ILedgerEntry } from '@/modules/Ledger/types/Ledger.types';
import { ExpenseCategory } from '../models/ExpenseCategory.model';
import { Ledger } from '@/modules/Ledger/Ledger';
import { Expense } from '../models/Expense.model';
import { ACCOUNT_TYPE } from '@/constants/accounts';

export class ExpenseGL {
  private expense: Expense;

  /**
   * Constructor method.
   * @param {Expense} expense - Expense.
   */
  constructor(expense: Expense) {
    this.expense = expense;
  }

  /**
   * Retrieves the expense GL common entry.
   */
  private getExpenseGLCommonEntry = () => {
    return {
      currencyCode: this.expense.currencyCode,
      exchangeRate: this.expense.exchangeRate,

      transactionType: 'Expense',
      transactionId: this.expense.id,

      date: this.expense.paymentDate,
      userId: this.expense.userId,

      debit: 0,
      credit: 0,

      branchId: this.expense.branchId,
    };
  };

  /**
   * Retrieves the expense GL payment entry.
   * @returns {ILedgerEntry}
   */
  private getExpenseGLPaymentEntry = (): ILedgerEntry => {
    const commonEntry = this.getExpenseGLCommonEntry();
    const settlementAccount = this.expense.payableAccountId
      ? this.expense.payableAccount
      : this.expense.paymentAccount;
    const accountId = this.expense.payableAccountId
      ? this.expense.payableAccountId
      : this.expense.paymentAccountId;

    return {
      ...commonEntry,
      credit:
        this.expense.localAmount +
        (this.expense.salesTaxAmountLocal || 0) -
        (this.expense.withholdingTaxAmountLocal || 0),
      accountId,
      ...(this.expense.payeeId &&
      settlementAccount?.isAccountType(ACCOUNT_TYPE.ACCOUNTS_PAYABLE)
        ? {
            contactId: this.expense.payeeId,
          }
        : {}),
      accountNormal:
        settlementAccount?.accountNormal === 'debit'
          ? AccountNormal.DEBIT
          : AccountNormal.CREDIT,
      index: 1,
    };
  };

  private getExpenseGLWithholdingTaxEntry = (): ILedgerEntry | null => {
    if (
      !this.expense.withholdingTaxAmount ||
      !this.expense.withholdingTaxAccountId
    ) {
      return null;
    }
    const commonEntry = this.getExpenseGLCommonEntry();
    const withholdingTaxAccount = this.expense.withholdingTaxAccount;

    return {
      ...commonEntry,
      credit: this.expense.withholdingTaxAmountLocal,
      accountId: this.expense.withholdingTaxAccountId,
      accountNormal:
        withholdingTaxAccount?.accountNormal === 'debit'
          ? AccountNormal.DEBIT
          : AccountNormal.CREDIT,
      note: this.expense.withholdingTaxName || undefined,
      index: 2,
    };
  };

  private getExpenseGLSalesTaxEntry = (index: number): ILedgerEntry | null => {
    if (!this.expense.salesTaxAmount || !this.expense.salesTaxAccountId) {
      return null;
    }
    const commonEntry = this.getExpenseGLCommonEntry();
    const salesTaxAccount = this.expense.salesTaxAccount;

    return {
      ...commonEntry,
      debit: this.expense.salesTaxAmountLocal,
      accountId: this.expense.salesTaxAccountId,
      accountNormal:
        salesTaxAccount?.accountNormal === 'debit'
          ? AccountNormal.DEBIT
          : AccountNormal.CREDIT,
      note: this.expense.salesTaxName || undefined,
      index,
    };
  };

  /**
   * Retrieves the expense GL category entry.
   * @param {ExpenseCategory} category - Expense category.
   * @param {number} index
   * @returns {ILedgerEntry}
   */
  private getExpenseGLCategoryEntry = R.curry(
    (category: ExpenseCategory, index: number, startIndex: number): ILedgerEntry => {
      const commonEntry = this.getExpenseGLCommonEntry();
      const localAmount = category.amount * this.expense.exchangeRate;

      return {
        ...commonEntry,
        accountId: category.expenseAccountId,
        accountNormal: AccountNormal.DEBIT,
        debit: localAmount,
        note: category.description,
        index: index + startIndex,
        projectId: category.projectId,
      };
    },
  );

  /**
   * Retrieves the expense GL entries.
   * @returns {ILedgerEntry[]}
   */
  public getExpenseGLEntries = (): ILedgerEntry[] => {
    const getCategoryEntry = this.getExpenseGLCategoryEntry();

    const paymentEntry = this.getExpenseGLPaymentEntry();
    const withholdingTaxEntry = this.getExpenseGLWithholdingTaxEntry();
    const salesTaxEntry = this.getExpenseGLSalesTaxEntry(
      withholdingTaxEntry ? 3 : 2,
    );
    const categoryStartIndex =
      2 + (withholdingTaxEntry ? 1 : 0) + (salesTaxEntry ? 1 : 0);
    const categoryEntries = this.expense.categories.map((category, index) =>
      getCategoryEntry(category, index, categoryStartIndex),
    );
    return [
      paymentEntry,
      ...(withholdingTaxEntry ? [withholdingTaxEntry] : []),
      ...(salesTaxEntry ? [salesTaxEntry] : []),
      ...categoryEntries,
    ];
  };

  /**
   * Retrieves the given expense ledger.
   * @returns {ILedger}
   */
  public getExpenseLedger = (): ILedger => {
    const entries = this.getExpenseGLEntries();

    return new Ledger(entries);
  };
}
