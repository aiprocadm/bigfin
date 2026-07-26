import { ContactAddressDto } from '@/modules/Customers/dtos/ContactAddress.dto';
import { IsEmail, IsString, IsBoolean, MaxLength } from 'class-validator';
import { IsOptional } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';

export class EditVendorDto extends ContactAddressDto {
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
  @IsOptional()
  @IsString()
  displayName?: string;

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

  @ApiProperty({ required: false, description: 'Whether the vendor is active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ required: false, description: 'Vendor code' })
  @IsOptional()
  @IsString()
  code?: string;

  // Российские юр.реквизиты контрагента (②a/②c).
  @ApiProperty({ required: false, description: 'Legal form (ООО/ИП/…)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  legalForm?: string;

  @ApiProperty({
    required: false,
    description: 'Tax identification number (ИНН)',
    example: '7707083893',
  })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  inn?: string;

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

