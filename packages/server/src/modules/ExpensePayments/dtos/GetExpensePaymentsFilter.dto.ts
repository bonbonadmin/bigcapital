import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetExpensePaymentsFilterDto {
  @IsOptional()
  @IsString()
  readonly columnSortBy?: string;

  @IsOptional()
  @IsIn(['desc', 'asc'])
  readonly sortOrder?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  readonly page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  readonly pageSize?: number;

  @IsOptional()
  @IsString()
  readonly searchKeyword?: string;
}
