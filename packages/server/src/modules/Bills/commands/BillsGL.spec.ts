import { BillGL } from './BillsGL';

describe('BillGL', () => {
  it('adds bill-level sales tax and withholding tax entries using the post-discount and adjustment base', () => {
    const bill = {
      id: 2001,
      currencyCode: 'IDR',
      exchangeRate: 1,
      billDate: '2026-04-20',
      userId: 1,
      referenceNo: 'BILL-001',
      billNumber: 'BILL-001',
      branchId: 1,
      projectId: null,
      vendorId: 10,
      totalLocal: 104.5,
      salesTaxAmount: 9.5,
      salesTaxAmountLocal: 9.5,
      salesTaxName: 'PPN Masukan',
      salesTaxAccountId: 1201,
      salesTaxAccount: {
        accountNormal: 'debit',
      },
      withholdingTaxAmount: 2,
      withholdingTaxAmountLocal: 2,
      withholdingTaxName: 'PPh 23',
      withholdingTaxAccountId: 2201,
      withholdingTaxAccount: {
        accountNormal: 'credit',
      },
      discountAmountLocal: 10,
      adjustmentLocal: 5,
      entries: [
        {
          totalExcludingTax: 100,
          allocatedCostEntries: [],
          item: { type: 'service', inventoryAccountId: null },
          itemId: 1,
          costAccountId: 5001,
        },
      ],
      locatedLandedCosts: [],
    } as any;

    const ledger = new BillGL(bill)
      .setPayableAccountId(2001)
      .setPurchaseDiscountAccountId(4101)
      .setOtherExpensesAccountId(4201)
      .getBillLedger()
      .entries;

    expect(ledger).toEqual([
      expect.objectContaining({
        accountId: 2001,
        credit: 102.5,
        debit: 0,
        indexGroup: 5,
      }),
      expect.objectContaining({
        accountId: 5001,
        debit: 100,
        credit: 0,
        indexGroup: 10,
      }),
      expect.objectContaining({
        accountId: 1201,
        debit: 9.5,
        credit: 0,
        indexGroup: 35,
      }),
      expect.objectContaining({
        accountId: 2201,
        credit: 2,
        debit: 0,
        indexGroup: 36,
      }),
      expect.objectContaining({
        accountId: 4101,
        credit: 10,
        debit: 0,
        indexGroup: 40,
      }),
      expect.objectContaining({
        accountId: 4201,
        debit: 5,
        credit: 0,
        indexGroup: 40,
      }),
    ]);
  });
});
