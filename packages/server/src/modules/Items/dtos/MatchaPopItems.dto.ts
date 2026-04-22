import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsOptional as IsOptionalDecorator, ToNumber } from '@/common/decorators/Validators';

export class ImportMatchaPopItemDto {
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'External MatchaPop product ID',
    example: 11,
  })
  externalId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({
    description: 'Item name',
    example: 'Classic Matcha Pack 1000g',
  })
  name: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Item code/SKU',
    required: false,
    example: '311',
  })
  code?: string;

  @IsString()
  @IsIn(['service', 'inventory', 'inventory-assembly'])
  @ApiProperty({
    description: 'Selected item type',
    enum: ['service', 'inventory', 'inventory-assembly'],
    example: 'inventory',
  })
  type: 'service' | 'inventory' | 'inventory-assembly';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({
    description: 'Selected unit of measure',
    example: 'each',
  })
  unitOfMeasure: string;

  @IsOptionalDecorator()
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'Matched item category ID',
    required: false,
    example: 1000,
  })
  categoryId?: number;

  @IsOptionalDecorator()
  @ToNumber()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @ApiProperty({
    description: 'Imported cost price',
    required: false,
    example: 0,
  })
  costPrice?: number;

  @IsOptionalDecorator()
  @ToNumber()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @ApiProperty({
    description: 'Imported retail/sell price',
    required: false,
    example: 1625000,
  })
  sellPrice?: number;
}

export class ImportMatchaPopItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMatchaPopItemDto)
  @ApiProperty({
    type: [ImportMatchaPopItemDto],
  })
  items: ImportMatchaPopItemDto[];
}
