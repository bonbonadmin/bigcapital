import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsOptional as IsOptionalDecorator,
  ToNumber,
} from '@/common/decorators/Validators';

export class ImportMatchaPopWarehouseDto {
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'External ERP warehouse ID',
    example: 2,
  })
  externalId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({
    description: 'Warehouse name',
    example: 'Jakarta',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({
    description: 'Warehouse code',
    example: '2',
  })
  code: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(1000)
  @ApiProperty({
    description: 'Warehouse address',
    required: false,
  })
  address?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Warehouse city',
    required: false,
  })
  city?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Warehouse country',
    required: false,
  })
  country?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Warehouse phone number',
    required: false,
  })
  phoneNumber?: string;
}

export class ImportMatchaPopWarehousesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMatchaPopWarehouseDto)
  @ApiProperty({
    type: [ImportMatchaPopWarehouseDto],
  })
  warehouses: ImportMatchaPopWarehouseDto[];
}
