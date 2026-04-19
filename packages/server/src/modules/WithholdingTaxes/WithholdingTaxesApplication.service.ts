import { Injectable } from '@nestjs/common';
import { CreateWithholdingTaxService } from './commands/CreateWithholdingTax.service';
import { DeleteWithholdingTaxService } from './commands/DeleteWithholdingTax.service';
import { EditWithholdingTaxService } from './commands/EditWithholdingTax.service';
import {
  CreateWithholdingTaxDto,
  EditWithholdingTaxDto,
} from './dtos/WithholdingTax.dto';
import { GetWithholdingTaxService } from './queries/GetWithholdingTax.service';
import { GetWithholdingTaxesService } from './queries/GetWithholdingTaxes.service';

@Injectable()
export class WithholdingTaxesApplication {
  constructor(
    private readonly createWithholdingTaxService: CreateWithholdingTaxService,
    private readonly editWithholdingTaxService: EditWithholdingTaxService,
    private readonly deleteWithholdingTaxService: DeleteWithholdingTaxService,
    private readonly getWithholdingTaxService: GetWithholdingTaxService,
    private readonly getWithholdingTaxesService: GetWithholdingTaxesService,
  ) {}

  public createWithholdingTax(withholdingTaxDTO: CreateWithholdingTaxDto) {
    return this.createWithholdingTaxService.createWithholdingTax(
      withholdingTaxDTO,
    );
  }

  public editWithholdingTax(
    withholdingTaxId: number,
    withholdingTaxDTO: EditWithholdingTaxDto,
  ) {
    return this.editWithholdingTaxService.editWithholdingTax(
      withholdingTaxId,
      withholdingTaxDTO,
    );
  }

  public deleteWithholdingTax(withholdingTaxId: number) {
    return this.deleteWithholdingTaxService.deleteWithholdingTax(
      withholdingTaxId,
    );
  }

  public getWithholdingTax(withholdingTaxId: number) {
    return this.getWithholdingTaxService.getWithholdingTax(withholdingTaxId);
  }

  public getWithholdingTaxes() {
    return this.getWithholdingTaxesService
      .getWithholdingTaxes()
      .then((withholdingTaxes) => ({ data: withholdingTaxes }));
  }
}
