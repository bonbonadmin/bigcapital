import { AttachmentTransformer } from '@/modules/Attachments/Attachment.transformer';
import { Transformer } from '@/modules/Transformer/Transformer';
import { ExpensePayment } from '../models/ExpensePayment';
import { ExpensePaymentEntryTransformer } from './ExpensePaymentEntry.transformer';

export class ExpensePaymentTransformer extends Transformer {
  public includeAttributes = (): string[] => {
    return [
      'formattedPaymentDate',
      'formattedCreatedAt',
      'formattedAmount',
      'formattedTotal',
      'formattedSubtotal',
      'entries',
      'attachments',
    ];
  };

  protected formattedPaymentDate = (expensePayment: ExpensePayment): string => {
    return this.formatDate(expensePayment.paymentDate);
  };

  protected formattedCreatedAt = (expensePayment: ExpensePayment): string => {
    return this.formatDate(expensePayment.createdAt);
  };

  protected formattedAmount = (expensePayment: ExpensePayment): string => {
    return this.formatNumber(expensePayment.amount, {
      currencyCode: expensePayment.currencyCode,
    });
  };

  protected formattedTotal = (expensePayment: ExpensePayment): string => {
    return this.formatNumber(expensePayment.amount, {
      currencyCode: expensePayment.currencyCode,
      money: true,
    });
  };

  protected formattedSubtotal = (expensePayment: ExpensePayment): string => {
    return this.formatNumber(expensePayment.amount, {
      currencyCode: expensePayment.currencyCode,
    });
  };

  protected entries = (expensePayment: ExpensePayment) => {
    return this.item(
      expensePayment.entries,
      new ExpensePaymentEntryTransformer(),
    );
  };

  protected attachments = (expensePayment: ExpensePayment) => {
    return this.item(expensePayment.attachments, new AttachmentTransformer());
  };
}
