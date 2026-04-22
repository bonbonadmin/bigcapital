import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { IsOptional, ToNumber } from '@/common/decorators/Validators';

export class InventoryAdjustmentsFilterDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @ToNumber()
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @ToNumber()
  @IsInt()
  pageSize?: number;
}
