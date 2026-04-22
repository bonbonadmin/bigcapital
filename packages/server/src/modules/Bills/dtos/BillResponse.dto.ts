import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ItemEntryDto } from '@/modules/TransactionItemEntry/dto/ItemEntry.dto';
import { AttachmentLinkDto } from '@/modules/Attachments/dtos/Attachment.dto';
import { BranchResponseDto } from '@/modules/Branches/dtos/BranchResponse.dto';
import { DiscountType } from '@/common/types/Discount';

export class BillResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the bill',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The bill number',
    example: 'BILL-2024-001',
  })
  billNumber: string;

  @ApiProperty({
    description: 'The date the bill was issued',
    example: '2024-03-15T00:00:00Z',
  })
  billDate: Date;

  @ApiProperty({
    description: 'The due date of the bill',
    example: '2024-04-15T00:00:00Z',
  })
  dueDate: Date;

  @ApiProperty({
    description: 'The reference number',
    example: 'PO-2024-001',
    required: false,
  })
  referenceNo?: string;

  @ApiProperty({
    description: 'The ID of the vendor',
    example: 1001,
  })
  vendorId: number;

  @ApiProperty({
    description: 'The ID of the accounts payable account',
    example: 401,
    required: false,
  })
  payableAccountId?: number;

  @ApiProperty({
    description: 'The sales tax rate ID applied to this bill',
    example: 10,
    required: false,
  })
  salesTaxRateId?: number;

  @ApiProperty({
    description: 'The sales tax name snapshot applied to this bill',
    example: 'PPN Masukan',
    required: false,
  })
  salesTaxName?: string;

  @ApiProperty({
    description: 'The sales tax rate snapshot applied to this bill',
    example: 11,
    required: false,
  })
  salesTaxRate?: number;

  @ApiProperty({
    description: 'The sales tax account snapshot applied to this bill',
    example: 1201,
    required: false,
  })
  salesTaxAccountId?: number;

  @ApiProperty({
    description: 'The sales tax amount applied to this bill',
    example: 14.3,
    required: false,
  })
  salesTaxAmount?: number;

  @ApiProperty({
    description: 'The withholding tax ID applied to this bill',
    example: 5,
    required: false,
  })
  withholdingTaxId?: number;

  @ApiProperty({
    description: 'The withholding tax name snapshot applied to this bill',
    example: 'PPh 23',
    required: false,
  })
  withholdingTaxName?: string;

  @ApiProperty({
    description: 'The withholding tax rate snapshot applied to this bill',
    example: 2,
    required: false,
  })
  withholdingTaxRate?: number;

  @ApiProperty({
    description: 'The withholding tax account snapshot applied to this bill',
    example: 2201,
    required: false,
  })
  withholdingTaxAccountId?: number;

  @ApiProperty({
    description: 'The withholding tax amount applied to this bill',
    example: 2,
    required: false,
  })
  withholdingTaxAmount?: number;

  @ApiProperty({
    description: 'The exchange rate for currency conversion',
    example: 1.25,
    required: false,
  })
  exchangeRate?: number;

  @ApiProperty({
    description: 'The currency code',
    example: 'USD',
    required: false,
  })
  currencyCode?: string;

  @ApiProperty({
    description: 'Additional notes about the bill',
    example: 'Office supplies and equipment for Q2 2024',
    required: false,
  })
  note?: string;

  @ApiProperty({
    description: 'Whether tax is inclusive in the item rates',
    example: false,
    required: false,
  })
  isInclusiveTax?: boolean;

  @ApiProperty({
    description: 'The line items of the bill',
    type: [ItemEntryDto],
  })
  entries: ItemEntryDto[];

  @ApiProperty({
    description: 'The ID of the warehouse',
    example: 101,
    required: false,
  })
  warehouseId?: number;

  @ApiProperty({
    description: 'The ID of the branch',
    example: 201,
    required: false,
  })
  branchId?: number;

  @ApiProperty({
    description: 'Branch details',
    type: () => BranchResponseDto,
    required: false,
  })
  @Type(() => BranchResponseDto)
  branch?: BranchResponseDto;

  @ApiProperty({
    description: 'The ID of the project',
    example: 301,
    required: false,
  })
  projectId?: number;

  @ApiProperty({
    description: 'The attachments of the bill',
    type: [AttachmentLinkDto],
    required: false,
  })
  attachments?: AttachmentLinkDto[];

  @ApiProperty({
    description: 'The discount value',
    example: 100,
    required: false,
  })
  discount?: number;

  @ApiProperty({
    description: 'The type of discount (percentage or fixed)',
    enum: DiscountType,
    example: DiscountType.Amount,
    required: false,
  })
  discountType?: DiscountType;

  @ApiProperty({
    description: 'The adjustment amount',
    example: 50,
    required: false,
  })
  adjustment?: number;

  @ApiProperty({
    description: 'The total amount of tax withheld',
    example: 50,
    required: false,
  })
  taxAmountWithheld?: number;

  @ApiProperty({
    description: 'The balance of the bill',
    example: 1000,
  })
  balance: number;

  @ApiProperty({
    description: 'The amount paid',
    example: 500,
  })
  paymentAmount: number;

  @ApiProperty({
    description: 'The amount credited',
    example: 0,
    required: false,
  })
  creditedAmount?: number;

  @ApiProperty({
    description: 'The subtotal amount before tax and adjustments',
    example: 900,
  })
  subtotal: number;

  @ApiProperty({
    description: 'The total amount including tax and adjustments',
    example: 1000,
  })
  total: number;

  @ApiProperty({
    description: 'The due amount remaining to be paid',
    example: 500,
  })
  dueAmount: number;

  @ApiProperty({
    description: 'The amount overpaid on this bill',
    example: 0,
    required: false,
  })
  overPaymentAmount?: number;

  @ApiProperty({
    description: 'Whether the bill is overdue',
    example: false,
  })
  isOverdue: boolean;

  @ApiProperty({
    description: 'Whether the bill is partially paid',
    example: true,
  })
  isPartiallyPaid: boolean;

  @ApiProperty({
    description: 'Whether the bill is fully paid',
    example: false,
  })
  isFullyPaid: boolean;

  @ApiProperty({
    description: 'Whether the bill has been overpaid',
    example: false,
  })
  isOverPaid: boolean;

  @ApiProperty({
    description: 'The date when the bill was created',
    example: '2024-03-15T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the bill was last updated',
    example: '2024-03-16T00:00:00Z',
    required: false,
  })
  updatedAt?: Date;
}
