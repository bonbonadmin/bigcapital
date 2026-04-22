import { Inject, Injectable } from '@nestjs/common';
import { SaleInvoice } from '../models/SaleInvoice';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentReceivedEntry } from '@/modules/PaymentReceived/models/PaymentReceivedEntry';

@Injectable()
export class CommandSaleInvoiceValidators {
  constructor(
    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(PaymentReceivedEntry.name)
    private readonly paymentReceivedEntryModel: TenantModelProxy<
      typeof PaymentReceivedEntry
    >,
  ) {}

  /**
   * Validates the given invoice is existance.
   * @param {SaleInvoice | undefined} invoice
   */
  public validateInvoiceExistance(invoice: SaleInvoice | undefined) {
    if (!invoice) {
      throw new ServiceError(ERRORS.SALE_INVOICE_NOT_FOUND);
    }
  }

  /**
   * Validate whether sale invoice number unqiue on the storage.
   * @param {string} invoiceNumber -
   * @param {number} notInvoiceId -
   */
  public async validateInvoiceNumberUnique(
    invoiceNumber: string,
    notInvoiceId?: number,
  ) {
    const saleInvoice = await this.saleInvoiceModel()
      .query()
      .findOne('invoice_no', invoiceNumber)
      .onBuild((builder) => {
        if (notInvoiceId) {
          builder.whereNot('id', notInvoiceId);
        }
      });
    if (saleInvoice) {
      throw new ServiceError(ERRORS.INVOICE_NUMBER_NOT_UNIQUE);
    }
  }

  /**
   * Validate the invoice amount is bigger than payment amount before edit the invoice.
   * @param {number} saleInvoiceAmount
   * @param {number} paymentAmount
   */
  public validateInvoiceAmountBiggerPaymentAmount(
    saleInvoiceAmount: number,
    paymentAmount: number,
  ) {
    if (saleInvoiceAmount < paymentAmount) {
      throw new ServiceError(ERRORS.INVOICE_AMOUNT_SMALLER_THAN_PAYMENT_AMOUNT);
    }
  }

  /**
   * Zero-total invoices are allowed only when no payment received exists.
   * @param {number} saleInvoiceId
   * @param {number} saleInvoiceAmount
   */
  public async validateZeroInvoiceHasNoPaymentEntries(
    saleInvoiceId: number,
    saleInvoiceAmount: number,
  ) {
    if (saleInvoiceAmount !== 0) return;

    const entries = await this.paymentReceivedEntryModel()
      .query()
      .where('invoice_id', saleInvoiceId);

    if (entries.length > 0) {
      throw new ServiceError(ERRORS.INVOICE_HAS_ASSOCIATED_PAYMENT_ENTRIES);
    }
  }

  /**
   * Validate the invoice number require.
   * @param {ISaleInvoice} saleInvoiceObj
   */
  public validateInvoiceNoRequire(invoiceNo: string) {
    if (!invoiceNo) {
      throw new ServiceError(ERRORS.SALE_INVOICE_NO_IS_REQUIRED);
    }
  }

  /**
   * Validate the given customer has no sales invoices.
   * @param {number} customerId - Customer id.
   */
  public async validateCustomerHasNoInvoices(customerId: number) {
    const invoices = await this.saleInvoiceModel()
      .query()
      .where('customer_id', customerId);

    if (invoices.length > 0) {
      throw new ServiceError(ERRORS.CUSTOMER_HAS_SALES_INVOICES);
    }
  }
}
