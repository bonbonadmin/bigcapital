import { Transformer } from '@/modules/Transformer/Transformer';
import { WithholdingTax } from '../models/WithholdingTax.model';

export class WithholdingTaxTransformer extends Transformer {
  public includeAttributes = (): string[] => {
    return ['nameFormatted', 'rateFormatted', 'accountName'];
  };

  protected nameFormatted = (withholdingTax: WithholdingTax): string => {
    return `${withholdingTax.name} [${withholdingTax.rate}%]`;
  };

  protected rateFormatted = (withholdingTax: WithholdingTax): string => {
    return `${withholdingTax.rate}%`;
  };

  protected accountName = (withholdingTax: any): string | null => {
    return withholdingTax.account?.name || null;
  };
}
