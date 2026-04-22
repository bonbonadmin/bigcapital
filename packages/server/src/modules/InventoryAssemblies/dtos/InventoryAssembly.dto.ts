import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ToNumber } from '@/common/decorators/Validators';

export class CreateInventoryAssemblyDto {
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'Assembly item ID',
    example: 1,
  })
  itemId: number;

  @ToNumber()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @ApiProperty({
    description: 'How many finished units to assemble',
    example: 1,
  })
  quantity: number;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'Assembly date',
    required: false,
    example: '2026-04-20',
  })
  date?: string;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'Warehouse ID',
    required: false,
    example: 1,
  })
  warehouseId?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'Branch ID',
    required: false,
    example: 1,
  })
  branchId?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Internal note for the build',
    required: false,
    example: 'Built for sales order SO-101',
  })
  note?: string;
}
