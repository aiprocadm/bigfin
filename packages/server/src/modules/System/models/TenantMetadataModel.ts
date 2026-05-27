import { BaseModel } from '@/models/Model';
import {
  defaultOrganizationAddressFormat,
  organizationAddressTextFormat,
} from '@/utils/address-text-format';
import { findByIsoCountryCode } from '@bigfin/utils';

export class TenantMetadata extends BaseModel {
  public baseCurrency!: string;
  public name!: string;
  public tenantId!: number;
  public industry!: string;
  public location!: string;
  public language!: string;
  public timezone!: string;
  public dateFormat!: string;
  public fiscalYear!: string;
  public primaryColor!: string;
  public logoKey!: string;
  public logoUri!: string;
  public address!: Record<string, any>;

  // Российские юридические реквизиты (опционально, наполняются
  // через UpdateOrganizationDto → saveMetadata spread).
  public legalForm!: string;
  public taxRegime!: string;
  public inn!: string;
  public kpp!: string;
  public ogrn!: string;
  public bankName!: string;
  public bankBik!: string;
  public bankAccount!: string;
  public bankCorrespondentAccount!: string;

  /**
   * Json schema.
   */
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['tenantId', 'name', 'baseCurrency'],
      properties: {
        tenantId: { type: 'integer' },
        name: { type: 'string', maxLength: 255 },
        industry: { type: 'string', maxLength: 255 },
        location: { type: 'string', maxLength: 255 },
        baseCurrency: { type: 'string', maxLength: 3 },
        language: { type: 'string', maxLength: 255 },
        timezone: { type: 'string', maxLength: 255 },
        dateFormat: { type: 'string', maxLength: 255 },
        fiscalYear: { type: 'string', maxLength: 255 },
        primaryColor: { type: 'string', maxLength: 7 }, // Assuming hex color code
        logoKey: { type: 'string', maxLength: 255 },
        address: { type: 'object' },
        legalForm: { type: 'string', maxLength: 20 },
        taxRegime: { type: 'string', maxLength: 20 },
        inn: { type: 'string', maxLength: 12 },
        kpp: { type: 'string', maxLength: 9 },
        ogrn: { type: 'string', maxLength: 15 },
        bankName: { type: 'string', maxLength: 255 },
        bankBik: { type: 'string', maxLength: 9 },
        bankAccount: { type: 'string', maxLength: 20 },
        bankCorrespondentAccount: { type: 'string', maxLength: 20 },
      },
    };
  }

  /**
   * Table name.
   */
  static tableName = 'tenants_metadata';

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return [];
  }

  /**
   * Virtual attributes.
   */
  static get virtualAttributes() {
    return ['logoUri'];
  }

  /**
   * Retrieves the organization address formatted text.
   * @returns {string}
   */
  public get addressTextFormatted() {
    const addressCountry = findByIsoCountryCode(this.location);

    return organizationAddressTextFormat(defaultOrganizationAddressFormat, {
      organizationName: this.name,
      address1: this.address?.address1,
      address2: this.address?.address2,
      state: this.address?.stateProvince,
      city: this.address?.city,
      postalCode: this.address?.postalCode,
      phone: this.address?.phone,
      country: addressCountry?.name ?? '',
    });
  }
}
