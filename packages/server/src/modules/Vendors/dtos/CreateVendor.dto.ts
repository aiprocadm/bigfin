import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumber,
  Min,
  IsBoolean,
  IsEmail,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ContactAddressDto } from '@/modules/Customers/dtos/ContactAddress.dto';
import { IsOptional, ToNumber } from '@/common/decorators/Validators';

export class CreateVendorDto extends ContactAddressDto {
  @ApiProperty({ required: false, description: 'Vendor opening balance' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @ToNumber()
  openingBalance?: number;

  @ApiProperty({
    required: false,
    description: 'Vendor opening balance exchange rate',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ToNumber()
  openingBalanceExchangeRate?: number;

  @ApiProperty({
    required: false,
    description: 'Date of the opening balance (required when openingBalance is provided)',
  })
  @ValidateIf((o) => o.openingBalance != null)
  @IsNotEmpty({ message: 'openingBalanceAt is required when openingBalance is provided' })
  @IsISO8601()
  openingBalanceAt?: Date;

  @ApiProperty({
    required: false,
    description: 'Branch ID for the opening balance',
  })
  @IsOptional()
  @IsInt()
  @ToNumber()
  openingBalanceBranchId?: number;

  @ApiProperty({ description: 'Currency code for the vendor' })
  @IsOptional()
  @IsString()
  currencyCode: string;

  @ApiProperty({ required: false, description: 'Vendor salutation' })
  @IsOptional()
  @IsString()
  salutation?: string;

  @ApiProperty({ required: false, description: 'Vendor first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'Vendor last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'Vendor company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ required: false, description: 'Vendor display name' })
  @IsString()
  displayName: string;

  @ApiProperty({ required: false, description: 'Vendor website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ required: false, description: 'Vendor email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Vendor work phone number' })
  @IsOptional()
  @IsString()
  workPhone?: string;

  @ApiProperty({ required: false, description: 'Vendor personal phone number' })
  @IsOptional()
  @IsString()
  personalPhone?: string;

  @ApiProperty({
    required: false,
    description: 'Additional notes about the vendor',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    required: false,
    description: 'Whether the vendor is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    required: false,
    description: 'Vendor code',
    example: 'VEND-001',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    required: false,
    description: 'Tax identification number (ИНН)',
    example: '7707083893',
  })
  @IsOptional()
  @IsString()
  inn?: string;

  // Российские юр.реквизиты контрагента (②a/②c).
  @ApiProperty({ required: false, description: 'Legal form (ООО/ИП/…)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  legalForm?: string;

  @ApiProperty({
    required: false,
    description: 'Tax registration reason code (КПП)',
    example: '770701001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  kpp?: string;

  @ApiProperty({
    required: false,
    description: 'Primary state registration number (ОГРН/ОГРНИП)',
    example: '1027700132195',
  })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  ogrn?: string;

  @ApiProperty({ required: false, description: 'Bank name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @ApiProperty({
    required: false,
    description: 'Bank identification code (БИК)',
    example: '044525225',
  })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  bankBik?: string;

  @ApiProperty({
    required: false,
    description: 'Bank account number (р/с)',
    example: '40702810400000000001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankAccount?: string;

  @ApiProperty({
    required: false,
    description: 'Correspondent account number (к/с)',
    example: '30101810400000000225',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankCorrespondentAccount?: string;
}

