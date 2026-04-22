import {
  IsString,
  IsIn,
  IsBoolean,
  IsNumber,
  IsInt,
  IsArray,
  ValidateIf,
  MaxLength,
  Min,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { Type } from 'class-transformer';

export class ItemAssemblyComponentDto {
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'Component inventory item ID',
    minimum: 1,
    example: 101,
  })
  itemId: number;

  @ToNumber()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @ApiProperty({
    description: 'Quantity of the component needed to build one unit',
    minimum: 0.001,
    example: 2,
  })
  quantity: number;
}

export class CommandItemDto {
  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'External system item ID',
    required: false,
    example: 11,
  })
  externalId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({
    description: 'Item name',
    example: 'Ergonomic Office Chair Model X-2000',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['service', 'non-inventory', 'inventory', 'inventory-assembly'])
  @ApiProperty({
    description: 'Item type',
    enum: ['service', 'non-inventory', 'inventory', 'inventory-assembly'],
    example: 'inventory',
  })
  type: 'service' | 'non-inventory' | 'inventory' | 'inventory-assembly';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Item code/SKU',
    required: false,
    example: 'CHAIR-X2000',
  })
  code?: string;

  // Purchase attributes
  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Whether the item can be purchased',
    required: false,
    example: true,
  })
  purchasable?: boolean;

  @IsOptional()
  @ToNumber()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @ValidateIf((o) => o.purchasable === true)
  @ApiProperty({
    description: 'Cost price of the item',
    required: false,
    minimum: 0,
    example: 299.99,
  })
  costPrice?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(0)
  @ValidateIf((o) => o.purchasable === true || o.type === 'inventory-assembly')
  @ApiProperty({
    description: 'ID of the cost account',
    required: false,
    minimum: 0,
    example: 1001,
  })
  costAccountId?: number;

  // Sell attributes
  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Whether the item can be sold',
    required: false,
    example: true,
  })
  sellable?: boolean;

  @IsOptional()
  @ToNumber()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @ValidateIf((o) => o.sellable === true)
  @ApiProperty({
    description: 'Selling price of the item',
    required: false,
    minimum: 0,
    example: 399.99,
  })
  sellPrice?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(0)
  @ValidateIf((o) => o.sellable === true)
  @ApiProperty({
    description: 'ID of the sell account',
    required: false,
    minimum: 0,
    example: 2001,
  })
  sellAccountId?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(0)
  @ValidateIf((o) => ['inventory', 'inventory-assembly'].includes(o.type))
  @ApiProperty({
    description: 'ID of the inventory account (required for inventory items)',
    required: false,
    minimum: 0,
    example: 3001,
  })
  inventoryAccountId?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Description shown on sales documents',
    required: false,
    example:
      'Premium ergonomic office chair with adjustable height, lumbar support, and breathable mesh back',
  })
  sellDescription?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Description shown on purchase documents',
    required: false,
    example: 'Ergonomic office chair - Model X-2000 with standard features',
  })
  purchaseDescription?: string;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @ApiProperty({
    description: 'ID of the tax rate applied to sales',
    required: false,
    example: 1,
  })
  sellTaxRateId?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @ApiProperty({
    description: 'ID of the tax rate applied to purchases',
    required: false,
    example: 1,
  })
  purchaseTaxRateId?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(0)
  @ApiProperty({
    description: 'ID of the item category',
    required: false,
    minimum: 0,
    example: 5,
  })
  categoryId?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Additional notes about the item',
    required: false,
    example:
      'Available in black, gray, and navy colors. 5-year warranty included.',
  })
  note?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Whether the item is active',
    required: false,
    default: true,
    example: true,
  })
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ApiProperty({
    description: 'IDs of media files associated with the item',
    required: false,
    type: [Number],
    example: [1, 2, 3],
  })
  mediaIds?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ValidateIf((o) => ['inventory', 'inventory-assembly'].includes(o.type))
  @ApiProperty({
    description: 'Unit of measure for inventory tracked items',
    required: false,
    example: 'each',
  })
  unitOfMeasure?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemAssemblyComponentDto)
  @ValidateIf((o) => o.type === 'inventory-assembly')
  @ApiProperty({
    description: 'Bill of materials for inventory assembly items',
    required: false,
    type: [ItemAssemblyComponentDto],
  })
  assemblyComponents?: ItemAssemblyComponentDto[];
}

export class CreateItemDto extends CommandItemDto {}
export class EditItemDto extends CommandItemDto {}
