import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { IsOptional, ToNumber } from '@/common/decorators/Validators';

export class UploadBillImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Bill image or PDF file',
  })
  file: any;

  @ApiPropertyOptional({
    type: Number,
    description: 'Bank account id',
    nullable: true,
  })
  @IsOptional()
  @ToNumber()
  @IsInt()
  bankAccountId?: number;

  @ApiPropertyOptional({
    type: Number,
    description: 'Accounts payable account id',
    nullable: true,
  })
  @IsOptional()
  @ToNumber()
  @IsInt()
  apId?: number;
}
