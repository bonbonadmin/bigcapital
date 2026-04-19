import { ToNumber } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CommandWithholdingTaxDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the withholding tax.',
    example: 'PPh 23',
  })
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @ToNumber()
  @ApiProperty({
    description: 'The withholding tax rate.',
    example: 2,
  })
  rate: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The description of the withholding tax.',
    example: 'Indonesia withholding tax for services.',
    required: false,
  })
  description?: string;

  @IsInt()
  @IsNotEmpty()
  @ToNumber()
  @ApiProperty({
    description: 'The asset or liability account used for this withholding tax.',
    example: 1201,
  })
  accountId: number;
}

export class CreateWithholdingTaxDto extends CommandWithholdingTaxDto {}
export class EditWithholdingTaxDto extends CommandWithholdingTaxDto {}
