import { SaleInvoiceTransformer } from "@/modules/SaleInvoices/queries/SaleInvoice.transformer";
import { Transformer } from "@/modules/Transformer/Transformer";


export class PaymentReceivedEntryTransfromer extends Transformer {
  /**
   * Include these attributes to payment receive entry object.
   * @returns {Array}
   */
  public includeAttributes = (): string[] => {
    return [
      'paymentAmountFormatted',
      'dueAmount',
      'dueAmountFormatted',
      'invoice',
    ];
  };

  /**
   * Retreives the payment amount formatted.
   * @param entry
   * @returns {string}
   */
  protected paymentAmountFormatted(entry) {
    return this.formatNumber(entry.paymentAmount, { money: false });
  }

  protected dueAmount(entry) {
    return (
      (Number(entry?.invoice?.dueAmount) || 0) +
      (Number(entry?.paymentAmount) || 0)
    );
  }

  protected dueAmountFormatted(entry) {
    return this.formatNumber(this.dueAmount(entry), {
      currencyCode: entry?.invoice?.currencyCode,
      money: true,
    });
  }

  /**
   * Retreives the transformed invoice.
   */
  protected invoice(entry) {
    return this.item(entry.invoice, new SaleInvoiceTransformer());
  }
}
