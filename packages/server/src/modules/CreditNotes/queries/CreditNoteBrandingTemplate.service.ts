import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { defaultCreditNoteBrandingAttributes } from '../constants';
import { GetPdfTemplateService } from '../../PdfTemplate/queries/GetPdfTemplate.service';
import { GetOrganizationBrandingAttributesService } from '../../PdfTemplate/queries/GetOrganizationBrandingAttributes.service';
import { mergePdfTemplateWithDefaultAttributes } from '../../SaleInvoices/utils';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';

@Injectable()
export class CreditNoteBrandingTemplate {
  constructor(
    private getPdfTemplateService: GetPdfTemplateService,
    private getOrgBrandingAttributes: GetOrganizationBrandingAttributesService,
    private readonly i18n: I18nService,
    private readonly orgI18n: OrganizationI18nService,
  ) {}

  /**
   * Retrieves the credit note branding template.
   * @param {number} templateId
   * @returns {}
   */
  public async getCreditNoteBrandingTemplate(templateId: number) {
    const template =
      await this.getPdfTemplateService.getPdfTemplate(templateId);

    // Retrieves the organization branding attributes.
    const commonOrgBrandingAttrs =
      await this.getOrgBrandingAttributes.execute();

    // Лейблы по умолчанию — на языке организации (tenants_metadata.language).
    // Язык резолвится один раз; переводы берутся из памяти (i18n.t синхронно).
    // Пользовательские правки (commonOrgBrandingAttrs) идут после и имеют приоритет.
    const lang = await this.orgI18n.getLanguage();
    const translatedLabels = {
      bigTitleLabel: this.i18n.t('pdf.credit_note.title', { lang }),
      billedToLabel: this.i18n.t('pdf.label.billed_to', { lang }),
      totalLabel: this.i18n.t('pdf.label.total', { lang }),
      subtotalLabel: this.i18n.t('pdf.label.subtotal', { lang }),
      customerNoteLabel: this.i18n.t('pdf.label.customer_note', { lang }),
      termsConditionsLabel: this.i18n.t('pdf.label.terms', { lang }),
      creditNoteNumberLabel: this.i18n.t('pdf.credit_note.number', { lang }),
      creditNoteDateLabel: this.i18n.t('pdf.credit_note.date', { lang }),
    };

    // Merges the default branding attributes with common organization branding attrs.
    const organizationBrandingAttrs = {
      ...defaultCreditNoteBrandingAttributes,
      ...translatedLabels,
      ...commonOrgBrandingAttrs,
    };
    const brandingTemplateAttrs = {
      ...template.attributes,
      companyLogoUri: template.companyLogoUri,
    };
    const attributes = mergePdfTemplateWithDefaultAttributes(
      brandingTemplateAttrs,
      organizationBrandingAttrs,
    );
    return {
      ...template,
      attributes,
    };
  }
}
