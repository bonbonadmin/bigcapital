import { Module } from '@nestjs/common';
import { TransformerInjectable } from '../Transformer/TransformerInjectable.service';
import { CreateWithholdingTaxService } from './commands/CreateWithholdingTax.service';
import { DeleteWithholdingTaxService } from './commands/DeleteWithholdingTax.service';
import { EditWithholdingTaxService } from './commands/EditWithholdingTax.service';
import { WithholdingTaxesController } from './WithholdingTaxes.controller';
import { WithholdingTaxesApplication } from './WithholdingTaxesApplication.service';
import { GetWithholdingTaxService } from './queries/GetWithholdingTax.service';
import { GetWithholdingTaxesService } from './queries/GetWithholdingTaxes.service';

@Module({
  controllers: [WithholdingTaxesController],
  providers: [
    TransformerInjectable,
    CreateWithholdingTaxService,
    EditWithholdingTaxService,
    DeleteWithholdingTaxService,
    GetWithholdingTaxService,
    GetWithholdingTaxesService,
    WithholdingTaxesApplication,
  ],
})
export class WithholdingTaxesModule {}
