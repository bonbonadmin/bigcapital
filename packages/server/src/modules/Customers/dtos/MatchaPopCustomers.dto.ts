import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsOptional as IsOptionalDecorator,
  ToNumber,
} from '@/common/decorators/Validators';

export class ImportMatchaPopCustomerDto {
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'External ERP customer ID',
    example: 54,
  })
  externalId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({
    description: 'Customer first name',
    example: 'Sarah',
  })
  firstName: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Customer company name',
    required: false,
    example: 'PT Hegemoni Rasa',
  })
  companyName?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Customer last name',
    required: false,
    example: 'Rosaline',
  })
  lastName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({
    description: 'Customer display name',
    example: 'Sarah Rosaline',
  })
  displayName: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Customer phone number',
    required: false,
    example: '+6281934689147',
  })
  workPhone?: string;

  @IsOptionalDecorator()
  @IsEmail()
  @ApiProperty({
    description: 'Customer email',
    required: false,
    example: 'sarah@example.com',
  })
  email?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Billing city',
    required: false,
    example: 'Tangerang',
  })
  billingAddressCity?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Billing state/province',
    required: false,
    example: 'Banten',
  })
  billingAddressState?: string;
}

export class ImportMatchaPopCustomersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMatchaPopCustomerDto)
  @ApiProperty({
    type: [ImportMatchaPopCustomerDto],
  })
  customers: ImportMatchaPopCustomerDto[];
}
