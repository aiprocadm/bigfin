import { I18nService } from 'nestjs-i18n';
import { mergePdfTemplateWithDefaultAttributes } from '../utils';
import { defaultInvoicePdfTemplateAttributes } from '../constants';
import { GetOrganizationBrandingAttributesService } from '@/modules/PdfTemplate/queries/GetOrganizationBrandingAttributes.service';
import { GetPdfTemplateService } from '@/modules/PdfTemplate/queries/GetPdfTemplate.service';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SaleInvoicePdfTemplate {
  constructor(
    private readonly getPdfTemplateService: GetPdfTemplateService,
    private readonly getOrgBrandingAttributes: GetOrganizationBrandingAttributesService,
    private readonly i18n: I18nService,
    private readonly orgI18n: OrganizationI18nService,
  ) {}

  /**
   * Retrieves the invoice pdf template.
   * @param {number} invoiceTemplateId
   * @returns
   */
  async getInvoicePdfTemplate(invoiceTemplateId: number) {
    const template =
      await this.getPdfTemplateService.getPdfTemplate(invoiceTemplateId);

    // Retrieves the organization branding attributes.
    const commonOrgBrandingAttrs =
      await this.getOrgBrandingAttributes.execute();

    // Лейблы по умолчанию — на языке организации (tenants_metadata.language).
    // Язык резолвится один раз; переводы берутся из памяти (i18n.t синхронно).
    // Пользовательские правки (commonOrgBrandingAttrs) идут после и имеют приоритет.
    const lang = await this.orgI18n.getLanguage();
    const translatedLabels = {
      dueDateLabel: this.i18n.t('pdf.invoice.due_date', { lang }),
      dateIssueLabel: this.i18n.t('pdf.invoice.date_issue', { lang }),
      invoiceNumberLabel: this.i18n.t('pdf.invoice.number', { lang }),
      billedToLabel: this.i18n.t('pdf.label.billed_to', { lang }),
      lineItemLabel: this.i18n.t('pdf.label.line_item', { lang }),
      lineQuantityLabel: this.i18n.t('pdf.label.line_qty', { lang }),
      lineRateLabel: this.i18n.t('pdf.label.line_rate', { lang }),
      lineTotalLabel: this.i18n.t('pdf.label.line_total', { lang }),
      totalLabel: this.i18n.t('pdf.label.total', { lang }),
      subtotalLabel: this.i18n.t('pdf.label.subtotal', { lang }),
      discountLabel: this.i18n.t('pdf.label.discount', { lang }),
      paymentMadeLabel: this.i18n.t('pdf.invoice.payment_made', { lang }),
      balanceDueLabel: this.i18n.t('pdf.invoice.balance_due', { lang }),
      termsConditionsLabel: this.i18n.t('pdf.label.terms', { lang }),
      statementLabel: this.i18n.t('pdf.invoice.statement', { lang }),
    };
    const organizationBrandingAttrs = {
      ...defaultInvoicePdfTemplateAttributes,
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
