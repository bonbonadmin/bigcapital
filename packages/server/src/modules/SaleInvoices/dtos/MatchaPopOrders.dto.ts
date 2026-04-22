import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export const MATCHAPOP_SALE_INVOICE_SYNC_MODES = ['new', 'new_full', 'all'] as const;
export type MatchaPopSaleInvoiceSyncMode =
  (typeof MATCHAPOP_SALE_INVOICE_SYNC_MODES)[number];

export class SyncMatchaPopSaleInvoicesDto {
  @ApiPropertyOptional({
    description: 'ERP invoice sync mode.',
    enum: MATCHAPOP_SALE_INVOICE_SYNC_MODES,
    example: 'new',
  })
  @IsOptional()
  @IsString()
  @IsIn(MATCHAPOP_SALE_INVOICE_SYNC_MODES)
  mode?: MatchaPopSaleInvoiceSyncMode;
}

export class ImportMatchaPopSaleInvoicesDto {
  @ApiProperty({
    description: 'ERP order IDs to import as sale invoices.',
    example: [56, 55],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  orderIds!: number[];

  @ApiPropertyOptional({
    description: 'ERP invoice sync mode used to retrieve candidates.',
    enum: MATCHAPOP_SALE_INVOICE_SYNC_MODES,
    example: 'new',
  })
  @IsOptional()
  @IsString()
  @IsIn(MATCHAPOP_SALE_INVOICE_SYNC_MODES)
  mode?: MatchaPopSaleInvoiceSyncMode;

  @ApiPropertyOptional({
    description: 'Next sync marker returned by the ERP preview sync.',
    example: '2026-04-21T10:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  nextSyncAt?: string;
}
