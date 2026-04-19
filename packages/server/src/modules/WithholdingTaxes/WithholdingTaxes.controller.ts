import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { TaxRateAction } from '@/modules/TaxRates/TaxRates.types';
import {
  CreateWithholdingTaxDto,
  EditWithholdingTaxDto,
} from './dtos/WithholdingTax.dto';
import { WithholdingTaxResponseDto } from './dtos/WithholdingTaxResponse.dto';
import { WithholdingTaxesApplication } from './WithholdingTaxesApplication.service';

@Controller('withholding-taxes')
@ApiTags('Withholding Taxes')
@ApiExtraModels(WithholdingTaxResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class WithholdingTaxesController {
  constructor(
    private readonly withholdingTaxesApplication: WithholdingTaxesApplication,
  ) {}

  @Post()
  @RequirePermission(TaxRateAction.CREATE, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'Create a new withholding tax.' })
  @ApiResponse({
    status: 201,
    schema: { $ref: getSchemaPath(WithholdingTaxResponseDto) },
  })
  public createWithholdingTax(
    @Body() withholdingTaxDTO: CreateWithholdingTaxDto,
  ) {
    return this.withholdingTaxesApplication.createWithholdingTax(
      withholdingTaxDTO,
    );
  }

  @Put(':id')
  @RequirePermission(TaxRateAction.EDIT, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'Edit the given withholding tax.' })
  @ApiResponse({
    status: 200,
    schema: { $ref: getSchemaPath(WithholdingTaxResponseDto) },
  })
  public editWithholdingTax(
    @Param('id') withholdingTaxId: number,
    @Body() withholdingTaxDTO: EditWithholdingTaxDto,
  ) {
    return this.withholdingTaxesApplication.editWithholdingTax(
      withholdingTaxId,
      withholdingTaxDTO,
    );
  }

  @Delete(':id')
  @RequirePermission(TaxRateAction.DELETE, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'Delete the given withholding tax.' })
  @ApiResponse({
    status: 200,
    schema: { $ref: getSchemaPath(WithholdingTaxResponseDto) },
  })
  public deleteWithholdingTax(@Param('id') withholdingTaxId: number) {
    return this.withholdingTaxesApplication.deleteWithholdingTax(
      withholdingTaxId,
    );
  }

  @Get(':id')
  @RequirePermission(TaxRateAction.VIEW, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'Retrieve the withholding tax details.' })
  @ApiResponse({
    status: 200,
    schema: { $ref: getSchemaPath(WithholdingTaxResponseDto) },
  })
  public getWithholdingTax(@Param('id') withholdingTaxId: number) {
    return this.withholdingTaxesApplication.getWithholdingTax(withholdingTaxId);
  }

  @Get()
  @RequirePermission(TaxRateAction.VIEW, AbilitySubject.TaxRate)
  @ApiOperation({ summary: 'Retrieve the withholding taxes.' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            $ref: getSchemaPath(WithholdingTaxResponseDto),
          },
        },
      },
    },
  })
  public getWithholdingTaxes() {
    return this.withholdingTaxesApplication.getWithholdingTaxes();
  }
}
