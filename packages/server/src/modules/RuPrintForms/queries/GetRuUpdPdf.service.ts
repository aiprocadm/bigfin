// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import {
  renderRuUpdPaperTemplateHtml,
  RuUpdPaperTemplateProps,
} from '@bigfin/pdf-templates';
import { GetSaleInvoice } from '@/modules/SaleInvoices/queries/GetSaleInvoice.service';
import { ChromiumlyTenancy } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { formatDateRu, formatMoneyRu } from '../utils/amountToWordsRu';
import {
  buildContactAddress,
  formatQuantity,
  joinRequisites,
} from '../utils/ruFormMapping';

const NO_VAT = 'Без НДС';

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
  const entries = invoice.entries || [];

  let totalExclVat = 0;
  let totalVat = 0;
  let totalInclVat = 0;
  let hasAnyVat = false;

  const lines = entries.map((entry: any, index: number) => {
    const quantity = Number(entry.quantity) || 0;
    const amount = quantity * (Number(entry.rate) || 0);
    const vatAmount = Number(entry.taxAmount) || 0;
    const amountExclVat = Number(entry.subtotalExcludingTax ?? amount) || 0;
    const amountInclVat =
      Number(entry.subtotalInclusingTax ?? amountExclVat + vatAmount) || 0;
    const priceExclVat = quantity ? amountExclVat / quantity : 0;
    const hasVat = vatAmount > 0;

    totalExclVat += amountExclVat;
    totalVat += vatAmount;
    totalInclVat += amountInclVat;
    hasAnyVat = hasAnyVat || hasVat;

    return {
      index: index + 1,
      title: entry.item?.name ?? entry.description ?? '',
      unit: '',
      quantity: formatQuantity(quantity),
      priceExclVat: formatMoneyRu(priceExclVat),
      amountExclVat: formatMoneyRu(amountExclVat),
      vatRate: hasVat ? `${Number(entry.taxRate) || 0}%` : NO_VAT,
      vatAmount: hasVat ? formatMoneyRu(vatAmount) : NO_VAT,
      amountInclVat: formatMoneyRu(amountInclVat),
    };
  });

  return {
    status: '1',
    documentNumber: invoice.invoiceNo ?? '',
    documentDate: formatDateRu(invoice.invoiceDate),

    sellerName: metadata?.name ?? '',
    sellerAddress: metadata?.addressTextFormatted ?? '',
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
    totalExclVat: formatMoneyRu(totalExclVat),
    totalVat: hasAnyVat ? formatMoneyRu(totalVat) : NO_VAT,
    totalInclVat: formatMoneyRu(totalInclVat),
  };
};
