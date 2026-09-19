// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import {
  renderRuInvoiceFacturaPaperTemplateHtml,
  RuInvoiceFacturaPaperTemplateProps,
} from '@bigfin/pdf-templates';
import { GetSaleInvoice } from '@/modules/SaleInvoices/queries/GetSaleInvoice.service';
import { ChromiumlyTenancy } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  formatDateNumericRu,
  toIsoDateString,
} from '../utils/amountToWordsRu';
import {
  buildContactAddress,
  buildContactShippingAddress,
  buildOrganizationAddress,
  DASH,
  formatInnKpp,
  hasGoodsEntries,
  isSoleProprietorInn,
  joinRequisites,
  mapInvoiceToRuVatLines,
  buildSignerProps,
} from '../utils/ruFormMapping';
import { sellerMetadataFor } from '../utils/resolveSellerRequisites';

/**
 * Дата, с которой применяется бланк в редакции постановления
 * Правительства РФ от 23.01.2026 № 26.
 */
const REDACTION_2026_APPLIED_FROM = '2026-04-01';

/**
 * Печатать ли бланк в редакции 2026 года. Решает ДАТА ДОКУМЕНТА:
 * счёт, выставленный до 01.04.2026, должен печататься по прежнему бланку
 * и после этой даты. Дату разобрать не удалось — берём действующий бланк.
 */
export const isInvoiceFacturaRedaction2026 = (
  invoiceDate: Date | string,
): boolean => {
  const isoDate = toIsoDateString(invoiceDate);
  return !isoDate || isoDate >= REDACTION_2026_APPLIED_FROM;
};

/**
 * Печатная форма РФ «Счёт-фактура» по счёту-продаже.
 * Печатается в альбомной ориентации.
 */
@Injectable()
export class GetRuInvoiceFacturaPdf {
  constructor(
    private readonly chromiumlyTenancy: ChromiumlyTenancy,
    private readonly getInvoiceService: GetSaleInvoice,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * HTML печатной формы (для превью и отладки).
   */
  public async getInvoiceFacturaHtml(invoiceId: number): Promise<string> {
    const props = await this.getInvoiceFacturaProps(invoiceId);
    return renderRuInvoiceFacturaPaperTemplateHtml(props);
  }

  /**
   * PDF печатной формы (альбомная ориентация).
   * @returns {Promise<[Buffer, string]>} [содержимое, имя файла]
   */
  public async getInvoiceFacturaPdf(
    invoiceId: number,
  ): Promise<[Buffer, string]> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const htmlContent = await this.getInvoiceFacturaHtml(invoiceId);
    const buffer = await this.chromiumlyTenancy.convertHtmlContent(htmlContent, {
      landscape: true,
    });

    return [buffer, `Schet-Faktura-${invoice.invoiceNo}`];
  }

  /**
   * Собирает данные шаблона из счёта и реквизитов организации.
   */
  public async getInvoiceFacturaProps(
    invoiceId: number,
  ): Promise<RuInvoiceFacturaPaperTemplateProps> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const tenant = await this.tenancyContext.getTenant(true);
    // Реквизиты продавца — ЮРЛИЦА документа (§8.3 ТЗ), а не общие настройки
    // аккаунта: документ от ООО обязан содержать реквизиты ООО. Контрагент
    // платит и отчитывается по тем реквизитам, что видит.
    const metadata = sellerMetadataFor(
      tenant.metadata,
      (invoice as any)?.legalEntity ?? null,
    );

    return transformToRuInvoiceFacturaProps(invoice, metadata);
  }
}

/**
 * Чистый маппинг «счёт + метаданные организации → props шаблона счёта-фактуры».
 */
export const transformToRuInvoiceFacturaProps = (
  invoice: any,
  metadata: any,
): RuInvoiceFacturaPaperTemplateProps => {
  const entries = invoice.entries || [];
  const mapped = mapInvoiceToRuVatLines(invoice);
  const customer = invoice.customer;

  // Грузоотправителя и грузополучателя заполняют только при отгрузке
  // товаров; при оказании услуг в этих строках ставится прочерк.
  const shipsGoods = hasGoodsEntries(entries);

  return {
    ...buildSignerProps(metadata),

    documentNumber: invoice.invoiceNo ?? '',
    documentDate: formatDateNumericRu(invoice.invoiceDate),
    correctionNumber: DASH,
    correctionDate: DASH,

    sellerName: metadata?.name ?? '',
    sellerAddress: buildOrganizationAddress(metadata),
    sellerInnKpp: formatInnKpp(metadata?.inn, metadata?.kpp),

    shipperLine: shipsGoods ? 'он же' : DASH,
    consigneeLine: shipsGoods
      ? joinRequisites([
          customer?.displayName,
          buildContactShippingAddress(customer),
        ]) || DASH
      : DASH,
    paymentDocument: DASH,
    shipmentDocument: DASH,
    advanceInvoice: DASH,
    isRedaction2026: isInvoiceFacturaRedaction2026(invoice.invoiceDate),

    buyerName: customer?.displayName ?? '',
    buyerAddress: buildContactAddress(customer),
    buyerInnKpp: formatInnKpp(customer?.inn, customer?.kpp),

    currencyLine:
      (invoice.currencyCode ?? 'RUB') === 'RUB'
        ? 'Российский рубль, 643'
        : invoice.currencyCode,
    govContractId: DASH,

    lines: mapped.lines.map((line) => ({
      index: line.index,
      title: line.title,
      quantity: line.quantityText,
      price: line.priceExclVatText,
      amountExclVat: line.amountExclVatText,
      vatRate: line.vatRateText,
      vatAmount: line.vatAmountText,
      amountInclVat: line.amountInclVatText,
    })),

    totalAmountExclVat: mapped.totalExclVatText,
    totalVatAmount: mapped.totalVatText,
    totalAmountInclVat: mapped.totalInclVatText,

    // Юр. форма — прямой признак (Р2 срез 4): ИП с выбранной формой, но не
    // заполненным ИНН получал бланк с подписями «Руководитель» и «Главбух».
    // Длина ИНН остаётся запасным признаком для организаций без юр. формы.
    isSoleProprietor:
      metadata?.legalForm === 'IP' ||
      metadata?.legalForm === 'NPD' ||
      isSoleProprietorInn(metadata?.inn),
    soleProprietorOgrn: metadata?.ogrn ?? '',
  };
};
