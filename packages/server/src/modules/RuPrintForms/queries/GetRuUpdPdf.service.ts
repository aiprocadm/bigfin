// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import {
  renderRuUpdPaperTemplateHtml,
  RuUpdPaperTemplateProps,
} from '@bigfin/pdf-templates';
import { GetSaleInvoice } from '@/modules/SaleInvoices/queries/GetSaleInvoice.service';
import { ChromiumlyTenancy } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { formatDateRu } from '../utils/amountToWordsRu';
import {
  buildContactAddress,
  buildOrganizationAddress,
  joinRequisites,
  mapInvoiceToRuVatLines,
} from '../utils/ruFormMapping';

/**
 * Печатная форма РФ «Универсальный передаточный документ» (УПД, статус 1)
 * по счёту-продаже. Печатается в альбомной ориентации.
 */
@Injectable()
export class GetRuUpdPdf {
  constructor(
    private readonly chromiumlyTenancy: ChromiumlyTenancy,
    private readonly getInvoiceService: GetSaleInvoice,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * HTML печатной формы (для превью и отладки).
   */
  public async getUpdHtml(invoiceId: number): Promise<string> {
    const props = await this.getUpdProps(invoiceId);
    return renderRuUpdPaperTemplateHtml(props);
  }

  /**
   * PDF печатной формы (альбомная ориентация).
   * @returns {Promise<[Buffer, string]>} [содержимое, имя файла]
   */
  public async getUpdPdf(invoiceId: number): Promise<[Buffer, string]> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const htmlContent = await this.getUpdHtml(invoiceId);
    const buffer = await this.chromiumlyTenancy.convertHtmlContent(
      htmlContent,
      { landscape: true },
    );

    return [buffer, `UPD-${invoice.invoiceNo}`];
  }

  /**
   * Собирает данные шаблона из счёта и реквизитов организации.
   */
  public async getUpdProps(invoiceId: number): Promise<RuUpdPaperTemplateProps> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const tenant = await this.tenancyContext.getTenant(true);
    const metadata = tenant.metadata;

    return transformToRuUpdProps(invoice, metadata);
  }
}

/**
 * Чистый маппинг «счёт + метаданные организации → props шаблона УПД».
 */
export const transformToRuUpdProps = (
  invoice: any,
  metadata: any,
): RuUpdPaperTemplateProps => {
  const mapped = mapInvoiceToRuVatLines(invoice);

  const lines = mapped.lines.map((line) => ({
    index: line.index,
    title: line.title,
    unit: '',
    quantity: line.quantityText,
    priceExclVat: line.priceExclVatText,
    amountExclVat: line.amountExclVatText,
    vatRate: line.vatRateText,
    vatAmount: line.vatAmountText,
    amountInclVat: line.amountInclVatText,
  }));

  return {
    status: '1',
    documentNumber: invoice.invoiceNo ?? '',
    documentDate: formatDateRu(invoice.invoiceDate),

    sellerName: metadata?.name ?? '',
    // `addressTextFormatted` приходит с разметкой (<strong>…</strong><br/>) —
    // без очистки теги уезжали прямо в PDF (Р2 срез 4 карты v16).
    sellerAddress: buildOrganizationAddress(metadata),
    sellerInnKpp: joinRequisites([metadata?.inn, metadata?.kpp]).replace(
      ', ',
      ' / ',
    ),

    buyerName: invoice.customer?.displayName ?? '',
    buyerAddress: buildContactAddress(invoice.customer),
    buyerInnKpp: joinRequisites([
      invoice.customer?.inn,
      invoice.customer?.kpp,
    ]).replace(', ', ' / '),

    currencyLine:
      (invoice.currencyCode ?? 'RUB') === 'RUB'
        ? 'Российский рубль, 643'
        : invoice.currencyCode,

    baseDocument: `Счёт № ${invoice.invoiceNo ?? ''} от ${formatDateRu(
      invoice.invoiceDate,
    )}`,

    lines,
    totalExclVat: mapped.totalExclVatText,
    totalVat: mapped.totalVatText,
    totalInclVat: mapped.totalInclVatText,
  };
};
