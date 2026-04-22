import { ExpenseGL } from './ExpenseGL';

describe('ExpenseGL', () => {
  it('splits payable credit between accounts payable and withholding tax', () => {
    const expense = {
      id: 1001,
      currencyCode: 'IDR',
      exchangeRate: 1,
      paymentDate: '2026-04-19',
      userId: 1,
      branchId: 1,
      payeeId: 10,
      localAmount: 1000,
      withholdingTaxAmount: 20,
      withholdingTaxAmountLocal: 20,
      withholdingTaxName: 'PPh 23',
      payableAccountId: 2001,
      paymentAccountId: null,
      payableAccount: {
        accountNormal: 'credit',
        isAccountType: (type) =>
          ['accounts-payable'].includes(type) ||
          (Array.isArray(type) && type.includes('accounts-payable')),
      },
      withholdingTaxAccountId: 2101,
      withholdingTaxAccount: {
        accountNormal: 'credit',
      },
      categories: [
        {
          amount: 1000,
          expenseAccountId: 5001,
          description: 'Service expense',
          projectId: null,
        },
      ],
    } as any;

    const ledger = new ExpenseGL(expense).getExpenseGLEntries();

    expect(ledger).toEqual([
      expect.objectContaining({
        accountId: 2001,
        credit: 980,
        debit: 0,
        contactId: 10,
        index: 1,
      }),
      expect.objectContaining({
        accountId: 2101,
        credit: 20,
        debit: 0,
        index: 2,
      }),
      expect.objectContaining({
        accountId: 5001,
        debit: 1000,
        credit: 0,
        index: 3,
      }),
    ]);
  });

  it('adds sales tax debit and increases accounts payable', () => {
    const expense = {
      id: 1002,
      currencyCode: 'IDR',
      exchangeRate: 1,
      paymentDate: '2026-04-19',
      userId: 1,
      branchId: 1,
      payeeId: 10,
      localAmount: 1000,
      salesTaxAmount: 110,
      salesTaxAmountLocal: 110,
      salesTaxName: 'PPN Masukan',
      withholdingTaxAmount: 0,
      withholdingTaxAmountLocal: 0,
      payableAccountId: 2001,
      paymentAccountId: null,
      payableAccount: {
        accountNormal: 'credit',
        isAccountType: (type) =>
          ['accounts-payable'].includes(type) ||
          (Array.isArray(type) && type.includes('accounts-payable')),
      },
      salesTaxAccountId: 1201,
      salesTaxAccount: {
        accountNormal: 'debit',
      },
      categories: [
        {
          amount: 1000,
          expenseAccountId: 5001,
          description: 'Service expense',
          projectId: null,
        },
      ],
    } as any;

    const ledger = new ExpenseGL(expense).getExpenseGLEntries();

    expect(ledger).toEqual([
      expect.objectContaining({
        accountId: 2001,
        credit: 1110,
        debit: 0,
        contactId: 10,
        index: 1,
      }),
      expect.objectContaining({
        accountId: 1201,
        debit: 110,
        credit: 0,
        index: 2,
      }),
      expect.objectContaining({
        accountId: 5001,
        debit: 1000,
        credit: 0,
        index: 3,
      }),
    ]);
  });

  it('adds sales tax debit and increases paid expense settlement credit', () => {
    const expense = {
      id: 1003,
      currencyCode: 'IDR',
      exchangeRate: 1,
      paymentDate: '2026-04-20',
      userId: 1,
      branchId: 1,
      localAmount: 1000,
      salesTaxAmount: 110,
      salesTaxAmountLocal: 110,
      salesTaxName: 'PPN Masukan',
      withholdingTaxAmount: 0,
      withholdingTaxAmountLocal: 0,
      payableAccountId: null,
      paymentAccountId: 1001,
      paymentAccount: {
        accountNormal: 'credit',
        isAccountType: () => false,
      },
      salesTaxAccountId: 1201,
      salesTaxAccount: {
        accountNormal: 'debit',
      },
      categories: [
        {
          amount: 1000,
          expenseAccountId: 5001,
          description: 'Service expense',
          projectId: null,
        },
      ],
    } as any;

    const ledger = new ExpenseGL(expense).getExpenseGLEntries();

    expect(ledger).toEqual([
      expect.objectContaining({
        accountId: 1001,
        credit: 1110,
        debit: 0,
        index: 1,
      }),
      expect.objectContaining({
        accountId: 1201,
        debit: 110,
        credit: 0,
        index: 2,
      }),
      expect.objectContaining({
        accountId: 5001,
        debit: 1000,
        credit: 0,
        index: 3,
      }),
    ]);
  });

  it('splits a paid expense between payment account and withholding tax account', () => {
    const expense = {
      id: 1004,
      currencyCode: 'IDR',
      exchangeRate: 1,
      paymentDate: '2026-04-21',
      userId: 1,
      branchId: 1,
      localAmount: 1000,
      salesTaxAmount: 0,
      salesTaxAmountLocal: 0,
      withholdingTaxAmount: 20,
      withholdingTaxAmountLocal: 20,
      withholdingTaxName: 'PPh 23',
      payableAccountId: null,
      paymentAccountId: 1001,
      paymentAccount: {
        accountNormal: 'credit',
        isAccountType: () => false,
      },
      withholdingTaxAccountId: 2101,
      withholdingTaxAccount: {
        accountNormal: 'credit',
      },
      categories: [
        {
          amount: 1000,
          expenseAccountId: 5001,
          description: 'Service expense',
          projectId: null,
        },
      ],
    } as any;

    const ledger = new ExpenseGL(expense).getExpenseGLEntries();

    expect(ledger).toEqual([
      expect.objectContaining({
        accountId: 1001,
        credit: 980,
        debit: 0,
        index: 1,
      }),
      expect.objectContaining({
        accountId: 2101,
        credit: 20,
        debit: 0,
        index: 2,
      }),
      expect.objectContaining({
        accountId: 5001,
        debit: 1000,
        credit: 0,
        index: 3,
      }),
    ]);
  });
});
