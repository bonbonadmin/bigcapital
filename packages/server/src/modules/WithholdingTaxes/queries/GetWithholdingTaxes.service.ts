import { Inject, Injectable } from '@nestjs/common';
import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { WithholdingTax } from '../models/WithholdingTax.model';
import { WithholdingTaxTransformer } from './WithholdingTax.transformer';

@Injectable()
export class GetWithholdingTaxesService {
  constructor(
    private readonly transformer: TransformerInjectable,

    @Inject(WithholdingTax.name)
    private readonly withholdingTaxModel: TenantModelProxy<typeof WithholdingTax>,
  ) {}

  public async getWithholdingTaxes() {
    const withholdingTaxes = await this.withholdingTaxModel()
      .query()
      .withGraphFetched('account')
      .orderBy('name', 'ASC');

    return this.transformer.transform(
      withholdingTaxes,
      new WithholdingTaxTransformer(),
    );
  }
}
