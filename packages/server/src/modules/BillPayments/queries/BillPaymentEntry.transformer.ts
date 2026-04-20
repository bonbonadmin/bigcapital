import { BillTransformer } from "../../Bills/queries/Bill.transformer";
import { Transformer } from "../../Transformer/Transformer";

export class BillPaymentEntryTransformer extends Transformer{
  /**
   * Include these attributes to bill payment object.
   * @returns {Array}
   */
  public includeAttributes = (): string[] => {
    return ['paymentAmountFormatted', 'dueAmount', 'dueAmountFormatted', 'bill'];
  };

  /**
   * Retreives the bill.
   */
  protected bill = (entry) => {
    return this.item(entry.bill, new BillTransformer());
  };

  /**
   * Retreives the payment amount formatted.
   * @returns {string}
   */
  protected paymentAmountFormatted(entry) {
    return this.formatNumber(entry.paymentAmount, { money: false });
  }

  protected dueAmount(entry) {
    return (
      (Number(entry?.bill?.dueAmount) || 0) +
      (Number(entry?.paymentAmount) || 0)
    );
  }

  protected dueAmountFormatted(entry) {
    return this.formatNumber(this.dueAmount(entry), {
      currencyCode: entry?.bill?.currencyCode,
      money: true,
    });
  }
}
