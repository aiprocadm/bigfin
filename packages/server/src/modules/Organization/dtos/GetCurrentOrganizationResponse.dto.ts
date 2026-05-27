import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationMetadataResponseDto {
  @ApiProperty({
    description: 'Internal numeric ID of the metadata',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Tenant ID associated with the organization',
    example: 101,
  })
  tenantId: number;

  @ApiProperty({
    description: 'Name of the organization',
    example: 'Acme Inc.',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Industry of the organization',
    example: 'Technology',
  })
  industry: string;

  @ApiProperty({ description: 'Location of the organization', example: 'US' })
  location: string;

  @ApiProperty({
    description: 'Base currency in ISO 4217 format',
    example: 'USD',
  })
  baseCurrency: string;

  @ApiProperty({
    description: 'Language/locale of the organization',
    example: 'en-US',
  })
  language: string;

  @ApiProperty({
    description: 'Timezone of the organization',
    example: 'America/New_York',
  })
  timezone: string;

  @ApiProperty({
    description: 'Date format used by the organization',
    example: 'MM/DD/YYYY',
  })
  dateFormat: string;

  @ApiProperty({
    description: 'Fiscal year of the organization',
    example: 'January',
  })
  fiscalYear: string;

  @ApiPropertyOptional({
    description: 'Tax identification number',
    example: '12-3456789',
    nullable: true,
  })
  taxNumber: string;

  @ApiPropertyOptional({
    description: 'Primary brand color in hex format',
    example: '#4285F4',
    nullable: true,
  })
  primaryColor: string;

  @ApiPropertyOptional({
    description: 'Logo file key reference',
    example: 'organizations/acme-logo-123456.png',
    nullable: true,
  })
  logoKey: string;

  @ApiPropertyOptional({
    description: 'Logo URL (presigned or public) for display',
    example: 'https://...',
    nullable: true,
  })
  logoUri: string;

  @ApiPropertyOptional({
    description: 'Organization address details',
    example: '123 Main St, New York, NY',
    nullable: true,
  })
  address: string;

  // --- Russian legal attributes (optional) ---

  @ApiPropertyOptional({
    description: 'Russian legal form (OOO/IP/NPD/AO)',
    example: 'OOO',
    nullable: true,
  })
  legalForm: string;

  @ApiPropertyOptional({
    description: 'Russian tax regime (USN_INCOME / USN_INCOME_EXPENSE / OSNO / PATENT / AUSN)',
    example: 'OSNO',
    nullable: true,
  })
  taxRegime: string;

  @ApiPropertyOptional({
    description: 'Russian INN (10 or 12 digits)',
    example: '7707083893',
    nullable: true,
  })
  inn: string;

  @ApiPropertyOptional({
    description: 'Russian KPP (9 characters)',
    example: '770701001',
    nullable: true,
  })
  kpp: string;

  @ApiPropertyOptional({
    description: 'OGRN (13 digits) or OGRNIP (15 digits)',
    example: '1027700132195',
    nullable: true,
  })
  ogrn: string;

  @ApiPropertyOptional({
    description: 'Bank name',
    example: 'ПАО Сбербанк',
    nullable: true,
  })
  bankName: string;

  @ApiPropertyOptional({
    description: 'BIK (9 digits starting with 04)',
    example: '044525225',
    nullable: true,
  })
  bankBik: string;

  @ApiPropertyOptional({
    description: 'Bank account (20 digits)',
    example: '40702810000000001234',
    nullable: true,
  })
  bankAccount: string;

  @ApiPropertyOptional({
    description: 'Correspondent account (20 digits starting with 30101)',
    example: '30101810400000000225',
    nullable: true,
  })
  bankCorrespondentAccount: string;
}

export class GetCurrentOrganizationResponseDto {
  @ApiProperty({
    description: 'Internal numeric ID of the organization',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Unique string identifier for the organization',
    example: 'org_123456',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Date when the organization was initialized',
    example: '2024-01-01T00:00:00.000Z',
  })
  initializedAt: Date;

  @ApiProperty({
    description: 'Date when the organization was seeded',
    example: '2024-01-01T01:00:00.000Z',
  })
  seededAt: Date;

  @ApiProperty({
    description: 'Date when the organization was built',
    example: '2024-01-01T02:00:00.000Z',
  })
  builtAt: Date;

  @ApiPropertyOptional({
    description: 'Database batch identifier, if any',
    example: 'batch_001',
    nullable: true,
  })
  databaseBatch: null | string;

  @ApiProperty({
    description: 'Organization metadata',
    type: () => [OrganizationMetadataResponseDto],
  })
  metadata: OrganizationMetadataResponseDto;

  @ApiProperty({
    description: 'Whether the organization is ready',
    example: true,
  })
  isReady: boolean;

  @ApiProperty({
    description: 'Whether a build process is currently running',
    example: false,
  })
  isBuildRunning: boolean;

  @ApiProperty({
    description: 'Whether an upgrade process is currently running',
    example: false,
  })
  isUpgradeRunning: boolean;
}
