import { Inject, Injectable } from '@nestjs/common';
import { sumBy, difference } from 'lodash';
import { Account } from '@/modules/Accounts/models/Account.model';
import { Expense } from '@/modules/Expenses/models/Expense.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ExpensePayment } from '../models/ExpensePayment';
import { ExpensePaymentEntry } from '../models/ExpensePaymentEntry';
import { ERRORS } from '../constants';
import {
  EditExpensePaymentDto,
  ExpensePaymentEntryDto,
} from '../dtos/ExpensePayment.dto';

@Injectable()
export class ExpensePaymentValidators {
  constructor(
    @Inject(Expense.name)
    private readonly expenseModel: TenantModelProxy<typeof Expense>,

    @Inject(ExpensePayment.name)
    private readonly expensePaymentModel: TenantModelProxy<typeof ExpensePayment>,

    @Inject(ExpensePaymentEntry.name)
    private readonly expensePaymentEntryModel: TenantModelProxy<
      typeof ExpensePaymentEntry
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async getPaymentOrThrowError(paymentId: number) {
    const payment = await this.expensePaymentModel()
      .query()
      .withGraphFetched('entries')
      .findById(paymentId);

    if (!payment) {
      throw new ServiceError(ERRORS.PAYMENT_NOT_FOUND);
    }
    return payment;
  }

  public async getPaymentAccountOrThrowError(paymentAccountId: number) {
    const paymentAccount = await this.accountModel()
      .query()
      .findById(paymentAccountId);

    if (!paymentAccount) {
      throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_FOUND);
    }
    if (
      !paymentAccount.isAccountType([
        ACCOUNT_TYPE.BANK,
        ACCOUNT_TYPE.CASH,
        ACCOUNT_TYPE.OTHER_CURRENT_ASSET,
      ])
    ) {
      throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_CURRENT_ASSET_TYPE);
    }
    return paymentAccount;
  }

  public async validatePaymentNumber(
    paymentNumber: string,
    notPaymentId?: number,
  ) {
    const foundPayment = await this.expensePaymentModel()
      .query()
      .onBuild((builder: any) => {
        builder.findOne('payment_number', paymentNumber);
        if (notPaymentId) {
          builder.whereNot('id', notPaymentId);
        }
      });

    if (foundPayment) {
      throw new ServiceError(ERRORS.PAYMENT_NUMBER_NOT_UNIQUE);
    }
    return foundPayment;
  }

  public async validateExpensesExistance(
    paymentEntries: { expenseId: number }[],
    vendorId: number,
  ) {
    const entriesExpenseIds = paymentEntries.map((entry) => entry.expenseId);

    const storedExpenses = await this.expenseModel()
      .query()
      .whereIn('id', entriesExpenseIds)
      .where('payee_id', vendorId);

    const storedExpenseIds = storedExpenses.map((expense: Expense) => expense.id);
    const notFoundExpenseIds = difference(entriesExpenseIds, storedExpenseIds);

    if (notFoundExpenseIds.length > 0) {
      throw new ServiceError(ERRORS.EXPENSE_ENTRIES_IDS_NOT_FOUND);
    }

    const notOpenedExpenses = storedExpenses.filter((expense) => !expense.openedAt);
    if (notOpenedExpenses.length > 0) {
      throw new ServiceError(ERRORS.EXPENSES_NOT_OPENED_YET, null, {
        notOpenedExpenses,
      });
    }
    return storedExpenses;
  }

  public async getPayableAccountIdFromExpensesOrThrowError(expenses: Expense[]) {
    const payableAccountIds = [...new Set(expenses.map((expense) => expense.payableAccountId).filter(Boolean))];

    if (payableAccountIds.length > 1) {
      throw new ServiceError(ERRORS.EXPENSES_HAVE_DIFFERENT_PAYABLE_ACCOUNTS);
    }
    return payableAccountIds[0] || null;
  }

  public getCurrencyCodeFromExpensesOrThrowError(expenses: Expense[]) {
    const currencyCodes = [...new Set(expenses.map((expense) => expense.currencyCode).filter(Boolean))];

    if (currencyCodes.length > 1) {
      throw new ServiceError(ERRORS.EXPENSES_HAVE_DIFFERENT_CURRENCIES);
    }
    return currencyCodes[0] || null;
  }

  public async validateExpensesDueAmount(
    paymentEntries: ExpensePaymentEntryDto[],
    oldPaymentEntries: ExpensePaymentEntry[] = [],
  ) {
    const expenseIds = paymentEntries.map((entry) => entry.expenseId);
    const storedExpenses = await this.expenseModel().query().whereIn('id', expenseIds);
    const storedExpensesMap = new Map(
      storedExpenses.map((expense) => {
        const oldEntries = oldPaymentEntries.filter(
          (entry) => entry.expenseId === expense.id,
        );
        const oldPaymentAmount = sumBy(oldEntries, 'paymentAmount') || 0;

        return [
          expense.id,
          { ...expense, dueAmount: expense.dueAmount + oldPaymentAmount },
        ];
      }),
    );

    const hasWrongPaymentAmount = [];

    paymentEntries.forEach((entry, index) => {
      const entryExpense = storedExpensesMap.get(entry.expenseId);
      const dueAmount = entryExpense?.dueAmount ?? 0;

      if (dueAmount < entry.paymentAmount) {
        hasWrongPaymentAmount.push({ index, due_amount: dueAmount });
      }
    });
    if (hasWrongPaymentAmount.length > 0) {
      throw new ServiceError(ERRORS.INVALID_EXPENSE_PAYMENT_AMOUNT);
    }
  }

  public async validateEntriesIdsExistance(
    paymentId: number,
    paymentEntries: ExpensePaymentEntry[],
  ) {
    const entriesIds = paymentEntries
      .filter((entry: any) => entry.id)
      .map((entry: any) => entry.id);

    const storedEntries = await this.expensePaymentEntryModel()
      .query()
      .where('expense_payment_id', paymentId);

    const storedEntriesIds = storedEntries.map((entry: any) => entry.id);
    const notFoundEntriesIds = difference(entriesIds, storedEntriesIds);

    if (notFoundEntriesIds.length > 0) {
      throw new ServiceError(ERRORS.PAYMENT_ENTRIES_NOT_FOUND);
    }
  }

  public validateVendorNotModified(
    paymentDTO: EditExpensePaymentDto,
    oldPayment: ExpensePayment,
  ) {
    if (paymentDTO.vendorId !== oldPayment.vendorId) {
      throw new ServiceError(ERRORS.PAYMENT_VENDOR_SHOULD_NOT_MODIFY);
    }
  }

  public validateWithdrawalAccountCurrency = (
    paymentAccountCurrency: string,
    paymentCurrency: string,
    baseCurrency: string,
  ) => {
    if (
      paymentAccountCurrency !== paymentCurrency &&
      paymentAccountCurrency !== baseCurrency
    ) {
      throw new ServiceError(ERRORS.WITHDRAWAL_ACCOUNT_CURRENCY_INVALID);
    }
  };
}
