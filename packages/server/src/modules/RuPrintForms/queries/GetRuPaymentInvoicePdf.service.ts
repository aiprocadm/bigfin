// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import {
  renderRuPaymentInvoicePaperTemplateHtml,
  RuPaymentInvoicePaperTemplateProps,
} from '@bigfin/pdf-templates';
import { GetSaleInvoice } from '@/modules/SaleInvoices/queries/GetSaleInvoice.service';
import { ChromiumlyTenancy } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { formatDateRu } from '../utils/amountToWordsRu';
import {
  buildBuyerLine,
  buildRuFormTotals,
  buildSellerLine,
  mapEntriesToRuFormLines,
  buildSignerProps,
} from '../utils/ruFormMapping';

/**
 * Печатная форма РФ «Счёт на оплату» по счёту-продаже (sale invoice).
 * Реквизиты продавца — из метаданных организации (②a), покупателя — из контакта.
 */
@Injectable()
export class GetRuPaymentInvoicePdf {
  constructor(
    private readonly chromiumlyTenancy: ChromiumlyTenancy,
    private readonly getInvoiceService: GetSaleInvoice,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * HTML печатной формы (для превью и отладки).
   */
  public async getPaymentInvoiceHtml(invoiceId: number): Promise<string> {
    const props = await this.getPaymentInvoiceProps(invoiceId);
    return renderRuPaymentInvoicePaperTemplateHtml(props);
  }

  /**
   * PDF печатной формы.
   * @returns {Promise<[Buffer, string]>} [содержимое, имя файла]
   */
  public async getPaymentInvoicePdf(
    invoiceId: number,
  ): Promise<[Buffer, string]> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const htmlContent = await this.getPaymentInvoiceHtml(invoiceId);
    const buffer = await this.chromiumlyTenancy.convertHtmlContent(htmlContent);

    return [buffer, `Schet-${invoice.invoiceNo}`];
  }

  /**
   * Собирает данные шаблона из счёта и реквизитов организации.
   */
  public async getPaymentInvoiceProps(
    invoiceId: number,
  ): Promise<RuPaymentInvoicePaperTemplateProps> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const tenant = await this.tenancyContext.getTenant(true);
    const metadata = tenant.metadata;

    return transformToRuPaymentInvoiceProps(invoice, metadata);
  }
}

/**
 * Чистый маппинг «счёт + метаданные организации → props шаблона».
 * Вынесен из сервиса ради простого юнит-тестирования.
 */
export const transformToRuPaymentInvoiceProps = (
  invoice: any,
  metadata: any,
): RuPaymentInvoicePaperTemplateProps => {
  const entries = invoice.entries || [];

  return {
    ...buildSignerProps(metadata),

    bankName: metadata?.bankName ?? '',
    bankBik: metadata?.bankBik ?? '',
    bankCorrespondentAccount: metadata?.bankCorrespondentAccount ?? '',
    bankAccount: metadata?.bankAccount ?? '',
    sellerInn: metadata?.inn ?? '',
    sellerKpp: metadata?.kpp ?? '',
    sellerName: metadata?.name ?? '',

    documentNumber: invoice.invoiceNo ?? '',
    documentDate: formatDateRu(invoice.invoiceDate),

    sellerLine: buildSellerLine(metadata),
    buyerLine: buildBuyerLine(invoice.customer),

    lines: mapEntriesToRuFormLines(entries),
    itemsCount: entries.length,

    ...buildRuFormTotals(invoice),
  };
};
