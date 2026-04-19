import { Inject, Injectable } from '@nestjs/common';
import { Expense } from '@/modules/Expenses/models/Expense.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { WithholdingTax } from '../models/WithholdingTax.model';

const ERRORS = {
  NOT_FOUND: 'WITHHOLDING_TAX_NOT_FOUND',
  IN_USE: 'WITHHOLDING_TAX_ALREADY_IN_USE',
};

@Injectable()
export class DeleteWithholdingTaxService {
  constructor(
    @Inject(WithholdingTax.name)
    private readonly withholdingTaxModel: TenantModelProxy<typeof WithholdingTax>,

    @Inject(Expense.name)
    private readonly expenseModel: TenantModelProxy<typeof Expense>,
  ) {}

  public async deleteWithholdingTax(withholdingTaxId: number) {
    const withholdingTax = await this.withholdingTaxModel()
      .query()
      .findById(withholdingTaxId);

    if (!withholdingTax) {
      throw new ServiceError(ERRORS.NOT_FOUND);
    }

    const referencedExpense = await this.expenseModel()
      .query()
      .findOne('withholding_tax_id', withholdingTaxId);

    if (referencedExpense) {
      throw new ServiceError(ERRORS.IN_USE);
    }

    await this.withholdingTaxModel().query().deleteById(withholdingTaxId);

    return withholdingTax;
  }
}
