import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactAddressDto } from './ContactAddress.dto';
import { IsOptional } from '@/common/decorators/Validators';

export class EditCustomerDto extends ContactAddressDto {
  @ApiProperty({ required: true, description: 'Customer type' })
  @IsString()
  @IsNotEmpty()
  customerType: string;

  @ApiProperty({ required: false, description: 'Salutation' })
  @IsOptional()
  @IsString()
  salutation?: string;

  @ApiProperty({ required: false, description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ required: true, description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ required: false, description: 'Website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ required: false, description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Work phone' })
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

  @ApiProperty({ required: false, description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ required: false, description: 'Customer code' })
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
