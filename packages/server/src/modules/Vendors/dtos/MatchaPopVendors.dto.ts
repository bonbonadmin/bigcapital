import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
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

export class ImportMatchaPopVendorDto {
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'External ERP vendor ID',
    example: 23,
  })
  externalId: number;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Vendor first name',
    required: false,
    example: 'Dicky Nuzul',
  })
  firstName?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Vendor last name',
    required: false,
    example: 'Smith',
  })
  lastName?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Vendor company name',
    required: false,
    example: 'Dicky Nuzul',
  })
  companyName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({
    description: 'Vendor display name',
    example: 'Dicky Nuzul',
  })
  displayName: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Vendor work phone',
    required: false,
    example: '+6281210688875',
  })
  workPhone?: string;

  @IsOptionalDecorator()
  @IsEmail()
  @ApiProperty({
    description: 'Vendor email',
    required: false,
    example: 'vendor@example.com',
  })
  email?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(1000)
  @ApiProperty({
    description: 'Vendor billing address line 1',
    required: false,
    example: 'Pondok Ungu Permai Sektor V Blok A10/08',
  })
  billingAddress1?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Vendor billing city',
    required: false,
    example: 'Bekasi',
  })
  billingAddressCity?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Vendor billing state/province',
    required: false,
    example: 'Jawa Barat',
  })
  billingAddressState?: string;

  @IsOptionalDecorator()
  @IsString()
  @MaxLength(50)
  @ApiProperty({
    description: 'Vendor billing postal code',
    required: false,
    example: '17610',
  })
  billingAddressPostcode?: string;
}

export class ImportMatchaPopVendorsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMatchaPopVendorDto)
  @ApiProperty({
    type: [ImportMatchaPopVendorDto],
  })
  vendors: ImportMatchaPopVendorDto[];
}
