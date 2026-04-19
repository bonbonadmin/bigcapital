import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ToNumber } from '@/common/decorators/Validators';

export class ExpensePaymentEntryDto {
  @ToNumber()
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The id of the expense', example: 1000 })
  expenseId: number;

  @ToNumber()
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The payment amount of the expense payment',
    example: 100,
  })
  paymentAmount: number;

  @ToNumber()
  @IsNumber()
  @IsOptional()
  id?: number;
}

export class CommandExpensePaymentDto {
  @ToNumber()
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The id of the vendor', example: 1 })
  vendorId: number;

  @ToNumber()
  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'The amount of the expense payment',
    example: 100,
    required: false,
  })
  amount?: number;

  @ToNumber()
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The id of the payment account', example: 1 })
  paymentAccountId: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The payment number of the expense payment',
    example: 'PAY-1001',
    required: false,
  })
  paymentNumber?: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The payment date of the expense payment',
    example: '2026-04-19',
  })
  paymentDate: Date | string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'The exchange rate of the expense payment',
    example: 1,
    required: false,
  })
  exchangeRate?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The statement of the expense payment',
    example: 'Partial settlement',
    required: false,
  })
  statement?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The reference of the expense payment',
    example: 'REF-123',
    required: false,
  })
  reference?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpensePaymentEntryDto)
  @ApiProperty({
    description: 'The entries of the expense payment',
    example: [
      {
        expenseId: 1000,
        paymentAmount: 100,
      },
    ],
  })
  entries: ExpensePaymentEntryDto[];

  @ToNumber()
  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'The id of the branch', example: 1 })
  branchId?: number;
}

export class CreateExpensePaymentDto extends CommandExpensePaymentDto {}
export class EditExpensePaymentDto extends CommandExpensePaymentDto {}
