import { Inject, Injectable } from '@nestjs/common';
import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ExpensePayment } from '../models/ExpensePayment';
import { ExpensePaymentTransformer } from './ExpensePaymentTransformer';

@Injectable()
export class GetExpensePaymentService {
  constructor(
    private readonly transformer: TransformerInjectable,

    @Inject(ExpensePayment.name)
    private readonly expensePaymentModel: TenantModelProxy<typeof ExpensePayment>,
  ) {}

  public async getExpensePayment(
    expensePaymentId: number,
  ): Promise<ExpensePayment> {
    const expensePayment = await this.expensePaymentModel()
      .query()
      .withGraphFetched('entries.expense')
      .withGraphFetched('vendor')
      .withGraphFetched('paymentAccount')
      .withGraphFetched('payableAccount')
      .withGraphFetched('branch')
      .withGraphFetched('attachments')
      .findById(expensePaymentId)
      .throwIfNotFound();

    return this.transformer.transform(
      expensePayment,
      new ExpensePaymentTransformer(),
    );
  }
}
