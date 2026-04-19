import { Module } from '@nestjs/common';
import { TenancyContext } from '../Tenancy/TenancyContext.service';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { TransformerInjectable } from '../Transformer/TransformerInjectable.service';
import { CreateWithholdingTaxService } from './commands/CreateWithholdingTax.service';
import { DeleteWithholdingTaxService } from './commands/DeleteWithholdingTax.service';
import { EditWithholdingTaxService } from './commands/EditWithholdingTax.service';
import { WithholdingTaxesController } from './WithholdingTaxes.controller';
import { WithholdingTaxesApplication } from './WithholdingTaxesApplication.service';
import { WithholdingTax } from './models/WithholdingTax.model';
import { GetWithholdingTaxService } from './queries/GetWithholdingTax.service';
import { GetWithholdingTaxesService } from './queries/GetWithholdingTaxes.service';

const models = [RegisterTenancyModel(WithholdingTax)];

@Module({
  imports: [...models],
  controllers: [WithholdingTaxesController],
  providers: [
    TransformerInjectable,
    TenancyContext,
    CreateWithholdingTaxService,
    EditWithholdingTaxService,
    DeleteWithholdingTaxService,
    GetWithholdingTaxService,
    GetWithholdingTaxesService,
    WithholdingTaxesApplication,
  ],
})
export class WithholdingTaxesModule {}
