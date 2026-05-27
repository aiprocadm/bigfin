import { TenantJobPayload } from '@/interfaces/Tenant';
import { SystemUser } from '../System/models/SystemUser';
import { BuildOrganizationDto } from './dtos/Organization.dto';
import { LegalForm, TaxRegime } from '../RussianLegalAttributes/constants';

export interface IOrganizationSetupDTO {
  organizationName: string;
  baseCurrency: string;
  fiscalYear: string;
  industry: string;
  timeZone: string;
}

export interface IOrganizationBuildDTO {
  name: string;
  industry: string;
  location: string;
  baseCurrency: string;
  timezone: string;
  fiscalYear: string;
  dateFormat?: string;
}

interface OrganizationAddressDTO {
  address1: string;
  address2: string;
  postalCode: string;
  city: string;
  stateProvince: string;
  phone: string;
}

export interface IOrganizationUpdateDTO {
  name: string;
  location?: string;
  baseCurrency?: string;
  timezone?: string;
  fiscalYear?: string;
  industry?: string;
  taxNumber?: string;
  primaryColor?: string;
  logoKey?: string;
  address?: OrganizationAddressDTO;

  // Russian legal attributes (optional). Flow end-to-end via
  // UpdateOrganizationService → tenantRepository.saveMetadata spread →
  // TenantMetadata.patch (columns added in PR #20).
  legalForm?: LegalForm;
  taxRegime?: TaxRegime;
  inn?: string;
  kpp?: string;
  ogrn?: string; // 13 digits (OGRN) or 15 digits (OGRNIP); same column for both
  bankName?: string;
  bankBik?: string;
  bankAccount?: string;
  bankCorrespondentAccount?: string;
}

export interface IOrganizationBuildEventPayload {
  tenantId: number;
  buildDTO: IOrganizationBuildDTO;
  systemUser: SystemUser;
}

export interface IOrganizationBuiltEventPayload {
  tenantId: number;
}

export const OrganizationBuildQueue = 'OrganizationBuildQueue';
export const OrganizationBuildQueueJob = 'OrganizationBuildQueueJob';

export interface OrganizationBuildQueueJobPayload extends TenantJobPayload {
  buildDto: BuildOrganizationDto;
}

export interface BuildOrganizationResult {
  delay: number;
  processedOn: number;
  jobId: string;
}
