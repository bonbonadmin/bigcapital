import { ExpenseTransfromer } from '@/modules/Expenses/queries/Expense.transformer';
import { Transformer } from '@/modules/Transformer/Transformer';

export class ExpensePaymentEntryTransformer extends Transformer {
  public includeAttributes = (): string[] => {
    return ['paymentAmountFormatted', 'expense'];
  };

  protected expense = (entry) => {
    return this.item(entry.expense, new ExpenseTransfromer());
  };

  protected paymentAmountFormatted(entry) {
    return this.formatNumber(entry.paymentAmount, { money: false });
  }
}
