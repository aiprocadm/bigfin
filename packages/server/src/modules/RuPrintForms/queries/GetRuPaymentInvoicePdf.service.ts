// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import {
  renderRuPaymentInvoicePaperTemplateHtml,
  RuPaymentInvoicePaperTemplateProps,
} from '@bigfin/pdf-templates';
import { GetSaleInvoice } from '@/modules/SaleInvoices/queries/GetSaleInvoice.service';
import { ChromiumlyTenancy } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  amountToWordsRu,
  formatDateRu,
  formatMoneyRu,
} from '../utils/amountToWordsRu';

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
  const vatAmount = Number(invoice.taxAmountWithheld) || 0;
  const hasVat = vatAmount > 0;
  const total = Number(invoice.total) || 0;
  const entries = invoice.entries || [];

  // Сумма прописью — только для рублёвых счетов: словесная форма
  // жёстко привязана к «рублям/копейкам».
  const totalInWords =
    (invoice.currencyCode ?? 'RUB') === 'RUB' ? amountToWordsRu(total) : '';

  return {
    bankName: metadata?.bankName ?? '',
    bankBik: metadata?.bankBik ?? '',
    bankCorrespondentAccount: metadata?.bankCorrespondentAccount ?? '',
    bankAccount: metadata?.bankAccount ?? '',
    sellerInn: metadata?.inn ?? '',
    sellerKpp: metadata?.kpp ?? '',
    sellerName: metadata?.name ?? '',

    documentNumber: invoice.invoiceNo ?? '',
    documentDate: formatDateRu(invoice.invoiceDate),

    sellerLine: joinRequisites([
      metadata?.name,
      metadata?.inn && `ИНН ${metadata.inn}`,
      metadata?.kpp && `КПП ${metadata.kpp}`,
      metadata?.addressTextFormatted,
    ]),
    buyerLine: joinRequisites([
      invoice.customer?.displayName,
      invoice.customer?.inn && `ИНН ${invoice.customer.inn}`,
    ]),

    lines: entries.map((entry: any, index: number) => ({
      index: index + 1,
      title: entry.item?.name ?? entry.description ?? '',
      quantity: formatQuantity(Number(entry.quantity) || 0),
      unit: '',
      price: formatMoneyRu(Number(entry.rate) || 0),
      // total учитывает скидку строки; fallback — кол-во × цена.
      amount: formatMoneyRu(
        Number(entry.total ?? (Number(entry.quantity) || 0) * (Number(entry.rate) || 0)) || 0,
      ),
    })),

    subtotal: formatMoneyRu(Number(invoice.subtotal) || 0),
    vatLabel: hasVat ? 'В том числе НДС' : 'Без налога (НДС)',
    vatAmount: hasVat ? formatMoneyRu(vatAmount) : undefined,
    total: formatMoneyRu(total),

    itemsCount: entries.length,
    totalInWords,
  };
};

/** Части реквизитов через запятую, пустые — пропускаются. */
const joinRequisites = (parts: Array<string | undefined | null | false>): string =>
  parts.filter(Boolean).join(', ');

/** Количество: целое — без дроби, иначе до 3 знаков в русском формате. */
const formatQuantity = (quantity: number): string => {
  if (Number.isInteger(quantity)) return String(quantity);
  return String(Math.round(quantity * 1000) / 1000).replace('.', ',');
};
