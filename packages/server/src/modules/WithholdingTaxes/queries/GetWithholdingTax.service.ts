import { Inject, Injectable } from '@nestjs/common';
import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { WithholdingTax } from '../models/WithholdingTax.model';
import { WithholdingTaxTransformer } from './WithholdingTax.transformer';

const ERRORS = {
  NOT_FOUND: 'WITHHOLDING_TAX_NOT_FOUND',
};

@Injectable()
export class GetWithholdingTaxService {
  constructor(
    private readonly transformer: TransformerInjectable,

    @Inject(WithholdingTax.name)
    private readonly withholdingTaxModel: TenantModelProxy<typeof WithholdingTax>,
  ) {}

  public async getWithholdingTax(withholdingTaxId: number) {
    const withholdingTax = await this.withholdingTaxModel()
      .query()
      .findById(withholdingTaxId)
      .withGraphFetched('account');

    if (!withholdingTax) {
      throw new ServiceError(ERRORS.NOT_FOUND);
    }

    return this.transformer.transform(
      withholdingTax,
      new WithholdingTaxTransformer(),
    );
  }
}
