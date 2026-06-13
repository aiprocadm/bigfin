import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { defaultSaleReceiptBrandingAttributes } from '../constants';
import { GetPdfTemplateService } from '@/modules/PdfTemplate/queries/GetPdfTemplate.service';
import { GetOrganizationBrandingAttributesService } from '@/modules/PdfTemplate/queries/GetOrganizationBrandingAttributes.service';
import { mergePdfTemplateWithDefaultAttributes } from '@/modules/SaleInvoices/utils';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';

@Injectable()
export class SaleReceiptBrandingTemplate {
  /**
   * @param {GetPdfTemplate} getPdfTemplateService -
   * @param {GetOrganizationBrandingAttributes} getOrgBrandingAttributes -
   */
  constructor(
    private readonly getPdfTemplateService: GetPdfTemplateService,
    private readonly getOrgBrandingAttributes: GetOrganizationBrandingAttributesService,
    private readonly i18n: I18nService,
    private readonly orgI18n: OrganizationI18nService,
  ) {}

  /**
   * Retrieves the sale receipt branding template.
   * @param {number} templateId - The ID of the PDF template.
   * @returns {Promise<Object>} The sale receipt branding template with merged attributes.
   */
  public async getSaleReceiptBrandingTemplate(templateId: number) {
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
      billedToLabel: this.i18n.t('pdf.label.billed_to', { lang }),
      totalLabel: this.i18n.t('pdf.label.total', { lang }),
      subtotalLabel: this.i18n.t('pdf.label.subtotal', { lang }),
      customerNoteLabel: this.i18n.t('pdf.label.customer_note', { lang }),
      termsConditionsLabel: this.i18n.t('pdf.label.terms', { lang }),
      receiptNumberLabel: this.i18n.t('pdf.receipt.number', { lang }),
      receiptDateLabel: this.i18n.t('pdf.receipt.date', { lang }),
    };

    // Merges the default branding attributes with organization common branding attrs.
    const organizationBrandingAttrs = {
      ...defaultSaleReceiptBrandingAttributes,
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
