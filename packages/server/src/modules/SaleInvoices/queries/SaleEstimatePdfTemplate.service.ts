import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { mergePdfTemplateWithDefaultAttributes } from '../utils';
import { GetPdfTemplateService } from '@/modules/PdfTemplate/queries/GetPdfTemplate.service';
import { GetOrganizationBrandingAttributesService } from '@/modules/PdfTemplate/queries/GetOrganizationBrandingAttributes.service';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { defaultEstimatePdfBrandingAttributes } from '@/modules/SaleEstimates/constants';

@Injectable()
export class SaleEstimatePdfTemplate {
  constructor(
    private readonly getPdfTemplateService: GetPdfTemplateService,
    private readonly getOrgBrandingAttrs: GetOrganizationBrandingAttributesService,
    private readonly i18n: I18nService,
    private readonly orgI18n: OrganizationI18nService,
  ) {}

  /**
   * Retrieves the estimate pdf template.
   * @param {number} invoiceTemplateId
   * @returns
   */
  public async getEstimatePdfTemplate(estimateTemplateId: number) {
    const template =
      await this.getPdfTemplateService.getPdfTemplate(estimateTemplateId);

    // Retreives the organization branding attributes.
    const commonOrgBrandingAttrs = await this.getOrgBrandingAttrs.execute();

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
      estimateNumberLabel: this.i18n.t('pdf.estimate.number', { lang }),
      estimateDateLabel: this.i18n.t('pdf.estimate.date', { lang }),
      expirationDateLabel: this.i18n.t('pdf.estimate.expiration', { lang }),
    };

    // Merge the default branding attributes with organization attrs.
    const orgainizationBrandingAttrs = {
      ...defaultEstimatePdfBrandingAttributes,
      ...translatedLabels,
      ...commonOrgBrandingAttrs,
    };
    const brandingTemplateAttrs = {
      ...template.attributes,
      companyLogoUri: template.companyLogoUri,
    };
    const attributes = mergePdfTemplateWithDefaultAttributes(
      brandingTemplateAttrs,
      orgainizationBrandingAttrs,
    );
    return {
      ...template,
      attributes,
    };
  }
}
