import { ApiProperty } from '@nestjs/swagger';

export class WithholdingTaxResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'PPh 23' })
  name: string;

  @ApiProperty({ example: 'PPh 23 [2%]' })
  nameFormatted: string;

  @ApiProperty({ example: 2 })
  rate: number;

  @ApiProperty({ example: '2%' })
  rateFormatted: string;

  @ApiProperty({
    example: 'Indonesia withholding tax for services.',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: 1201 })
  accountId: number;

  @ApiProperty({ example: 'Hutang Pajak PPh 23' })
  accountName: string;

  @ApiProperty({ example: '2026-04-19T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-19T10:00:00Z' })
  updatedAt: Date;
}
