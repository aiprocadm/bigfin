import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ContactAddressDto } from './ContactAddress.dto';

export class CreateCustomerDto extends ContactAddressDto {
  @ApiProperty({
    required: true,
    description: 'Customer type',
    example: 'business',
  })
  @IsString()
  @IsNotEmpty()
  customerType: string;

  @ApiProperty({
    required: true,
    description: 'Currency code',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  currencyCode: string;

  @ApiProperty({
    required: false,
    description: 'Opening balance',
    example: 5000.0,
  })
  @IsOptional()
  @IsNumber()
  @ToNumber()
  openingBalance?: number;

  @ApiProperty({
    required: false,
    description: 'Opening balance date (required when openingBalance is provided)',
    example: '2024-01-01',
  })
  @ValidateIf((o) => o.openingBalance != null)
  @IsNotEmpty({ message: 'openingBalanceAt is required when openingBalance is provided' })
  @IsString()
  openingBalanceAt?: string;

  @ApiProperty({
    required: false,
    description: 'Opening balance exchange rate',
    example: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @ToNumber()
  openingBalanceExchangeRate?: number;

  @ApiProperty({
    required: false,
    description: 'Opening balance branch ID',
    example: 101,
  })
  @IsOptional()
  @IsNumber()
  @ToNumber()
  openingBalanceBranchId?: number;

  @ApiProperty({
    required: false,
    description: 'Salutation',
    example: 'Mr.',
  })
  @IsOptional()
  @IsString()
  salutation?: string;

  @ApiProperty({
    required: false,
    description: 'First name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    required: false,
    description: 'Last name',
    example: 'Smith',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    required: false,
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({
    required: true,
    description: 'Display name',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({
    required: false,
    description: 'Website',
    example: 'https://www.acmecorp.com',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    required: false,
    description: 'Email',
    example: 'contact@acmecorp.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    required: false,
    description: 'Work phone',
    example: '+1 (555) 123-4567',
  })
  @IsOptional()
  @IsString()
  workPhone?: string;

  @ApiProperty({ required: false, description: 'Personal phone' })
  @IsOptional()
  @IsString()
  personalPhone?: string;

  @ApiProperty({ required: false, description: 'Note' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false, description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    required: false,
    description: 'Customer code',
    example: 'CUST-001',
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
