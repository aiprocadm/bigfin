import * as momentTz from 'moment-timezone';
import {
  IsEnum,
  IsHexColor,
  IsIn,
  IsISO31661Alpha2,
  IsISO4217CurrencyCode,
  IsOptional,
  IsString,
  Matches,
  Validate,
} from 'class-validator';
import { MONTHS } from '../Organization/constants';
import { ACCEPTED_LOCALES, DATE_FORMATS } from '../Organization.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalForm, TaxRegime } from '../../RussianLegalAttributes/constants';
import { InnConstraint } from '../../RussianLegalAttributes/validators/inn.validator';
import { KppConstraint } from '../../RussianLegalAttributes/validators/kpp.validator';
import { BikConstraint } from '../../RussianLegalAttributes/validators/bik.validator';
import {
  BankAccountConstraint,
  CorrespondentAccountConstraint,
} from '../../RussianLegalAttributes/validators/account.validator';

export class BuildOrganizationDto {
  @IsString()
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Inc.',
  })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Industry of the organization',
    example: 'Technology',
  })
  industry?: string;

  @IsISO31661Alpha2()
  @ApiProperty({
    description: 'Country location in ISO 3166-1 alpha-2 format',
    example: 'US',
  })
  location: string;

  @IsISO4217CurrencyCode()
  @ApiProperty({
    description: 'Base currency in ISO 4217 format',
    example: 'USD',
  })
  baseCurrency: string;

  @IsIn(momentTz.tz.names())
  @ApiProperty({
    description: 'Timezone of the organization',
    example: 'America/New_York',
  })
  timezone: string;

  @IsIn(MONTHS)
  @ApiProperty({
    description: 'Starting month of fiscal year',
    example: 'January',
  })
  fiscalYear: string;

  @IsIn(ACCEPTED_LOCALES)
  @ApiProperty({
    description: 'Language/locale of the organization',
    example: 'en-US',
  })
  language: string;

  @IsOptional()
  @IsIn(DATE_FORMATS)
  @ApiPropertyOptional({
    description: 'Date format used by the organization',
    example: 'MM/DD/YYYY',
  })
  dateFormat?: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Organization name',
    example: 'Acme Inc.',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Industry of the organization',
    example: 'Technology',
  })
  industry?: string;

  @IsOptional()
  @IsISO31661Alpha2()
  @ApiPropertyOptional({
    description: 'Country location in ISO 3166-1 alpha-2 format',
    example: 'US',
  })
  location?: string;

  @IsOptional()
  @IsISO4217CurrencyCode()
  @ApiPropertyOptional({
    description: 'Base currency in ISO 4217 format',
    example: 'USD',
  })
  baseCurrency?: string;

  @IsOptional()
  @IsIn(momentTz.tz.names())
  @ApiPropertyOptional({
    description: 'Timezone of the organization',
    example: 'America/New_York',
  })
  timezone?: string;

  @IsOptional()
  @IsIn(MONTHS)
  @ApiPropertyOptional({
    description: 'Starting month of fiscal year',
    example: 'January',
  })
  fiscalYear?: string;

  @IsOptional()
  @IsIn(ACCEPTED_LOCALES)
  @ApiPropertyOptional({
    description: 'Language/locale of the organization',
    example: 'en-US',
  })
  language?: string;

  @IsOptional()
  @IsIn(DATE_FORMATS)
  @ApiPropertyOptional({
    description: 'Date format used by the organization',
    example: 'MM/DD/YYYY',
  })
  dateFormat?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Organization address details',
    example: {
      address_1: '123 Main St',
      address_2: 'Suite 100',
      postal_code: '10001',
      city: 'New York',
      stateProvince: 'NY',
      phone: '+1-555-123-4567',
    },
  })
  address?: {
    address_1?: string;
    address_2?: string;
    postal_code?: string;
    city?: string;
    stateProvince?: string;
    phone?: string;
  };

  @IsOptional()
  @IsHexColor()
  @ApiPropertyOptional({
    description: 'Primary brand color in hex format',
    example: '#4285F4',
  })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Logo file key reference',
    example: 'organizations/acme-logo-123456.png',
  })
  logoKey?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Organization tax identification number',
    example: '12-3456789',
  })
  taxNumber?: string;

  // --- Russian legal attributes (optional) ---
  // Flow: this DTO → UpdateOrganizationService.execute → tenantRepository.saveMetadata
  // → TenantMetadata.patch({ tenantId, ...metadata }). Columns added in PR #20.

  @IsOptional()
  @IsEnum(LegalForm)
  @ApiPropertyOptional({
    description: 'Russian legal form (OOO/IP/NPD/AO; INDIVIDUAL is for contacts only)',
    enum: LegalForm,
    example: LegalForm.OOO,
  })
  legalForm?: LegalForm;

  @IsOptional()
  @IsEnum(TaxRegime)
  @ApiPropertyOptional({
    description: 'Russian tax regime (USN_INCOME / USN_INCOME_EXPENSE / OSNO / PATENT / AUSN)',
    enum: TaxRegime,
    example: TaxRegime.OSNO,
  })
  taxRegime?: TaxRegime;

  @IsOptional()
  @IsString()
  @Validate(InnConstraint)
  @ApiPropertyOptional({
    description: 'Russian INN: 10 digits (legal entity) or 12 digits (individual/IP/NPD), with checksum',
    example: '7707083893',
  })
  inn?: string;

  @IsOptional()
  @IsString()
  @Validate(KppConstraint)
  @ApiPropertyOptional({
    description: 'Russian KPP: 9 chars (4 digits + 2 digits-or-letters + 3 digits)',
    example: '770701001',
  })
  kpp?: string;

  // OGRN (13 digits) or OGRNIP (15 digits) share this column. Length check only —
  // full checksum (OgrnConstraint / OgrnipConstraint by length) is backlog.
  @IsOptional()
  @IsString()
  @Matches(/^\d{13}$|^\d{15}$/, {
    message: 'ogrn must be 13 digits (OGRN) or 15 digits (OGRNIP)',
  })
  @ApiPropertyOptional({
    description: 'OGRN (13 digits) or OGRNIP (15 digits)',
    example: '1027700132195',
  })
  ogrn?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Bank name (free text)',
    example: 'ПАО Сбербанк',
  })
  bankName?: string;

  @IsOptional()
  @IsString()
  @Validate(BikConstraint)
  @ApiPropertyOptional({
    description: 'BIK: 9 digits starting with 04',
    example: '044525225',
  })
  bankBik?: string;

  @IsOptional()
  @IsString()
  @Validate(BankAccountConstraint)
  @ApiPropertyOptional({
    description: 'Bank account: 20 digits',
    example: '40702810000000001234',
  })
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @Validate(CorrespondentAccountConstraint)
  @ApiPropertyOptional({
    description: 'Correspondent account: 20 digits starting with 30101',
    example: '30101810400000000225',
  })
  bankCorrespondentAccount?: string;
}
