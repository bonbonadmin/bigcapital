import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AttachmentLinkDto } from '@/modules/Attachments/dtos/Attachment.dto';

class ExpenseResponseDto {
  @ApiProperty({ description: 'The expense ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'The formatted payment date', example: '2024-01-01' })
  formattedDate: string;

  @ApiProperty({
    description: 'The formatted expense amount',
    example: '1,000.00 USD',
  })
  formattedAmount: string;

  @ApiProperty({
    description: 'The formatted due amount',
    example: '400.00 USD',
  })
  formattedDueAmount: string;

  @ApiProperty({ description: 'The reference number', example: 'EXP-001' })
  referenceNo: string;
}

class ExpensePaymentEntryResponseDto {
  @ApiProperty({
    description: 'The payment amount formatted',
    example: '100.00',
  })
  paymentAmountFormatted: string;

  @ApiProperty({ description: 'The expense details', type: ExpenseResponseDto })
  @Type(() => ExpenseResponseDto)
  expense: ExpenseResponseDto;
}

export class ExpensePaymentResponseDto {
  @ApiProperty({ description: 'The unique identifier of the expense payment' })
  id: number;

  @ApiProperty({ description: 'The vendor ID', example: 1 })
  vendorId: number;

  @ApiProperty({ description: 'The amount paid', example: 100 })
  amount: number;

  @ApiProperty({ description: 'The currency code', example: 'USD', required: false })
  currencyCode?: string;

  @ApiProperty({ description: 'The payment account ID', example: 2 })
  paymentAccountId: number;

  @ApiProperty({
    description: 'The accounts payable account ID',
    example: 401,
    required: false,
  })
  payableAccountId?: number;

  @ApiProperty({
    description: 'The payment number',
    example: 'PAY-2024-001',
    required: false,
  })
  paymentNumber?: string;

  @ApiProperty({ description: 'The payment date', example: '2024-01-01' })
  paymentDate: string;

  @ApiProperty({
    description: 'The formatted payment date',
    example: '2024-01-01',
  })
  formattedPaymentDate: string;

  @ApiProperty({ description: 'The exchange rate', example: 1, required: false })
  exchangeRate?: number;

  @ApiProperty({
    description: 'Statement or note',
    example: 'Payment for March expenses',
    required: false,
  })
  statement?: string;

  @ApiProperty({
    description: 'Reference number',
    example: 'REF-123',
    required: false,
  })
  reference?: string;

  @ApiProperty({ description: 'The branch ID', example: 1, required: false })
  branchId?: number;

  @ApiProperty({ description: 'The formatted amount', example: '100.00 USD' })
  formattedAmount: string;

  @ApiProperty({ description: 'The formatted total', example: '100.00 USD' })
  formattedTotal: string;

  @ApiProperty({ description: 'The formatted subtotal', example: '100.00 USD' })
  formattedSubtotal: string;

  @ApiProperty({
    description: 'The date when the payment was created',
    example: '2024-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The formatted created at date',
    example: '2024-01-01',
  })
  formattedCreatedAt: string;

  @ApiProperty({
    description: 'The entries of the expense payment',
    type: [ExpensePaymentEntryResponseDto],
  })
  @Type(() => ExpensePaymentEntryResponseDto)
  entries: ExpensePaymentEntryResponseDto[];

  @ApiProperty({
    description: 'The attachments of the expense payment',
    type: [AttachmentLinkDto],
    required: false,
  })
  @Type(() => AttachmentLinkDto)
  attachments?: AttachmentLinkDto[];
}
