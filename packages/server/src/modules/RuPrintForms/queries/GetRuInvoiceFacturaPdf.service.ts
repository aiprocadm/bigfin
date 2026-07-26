// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import {
  renderRuInvoiceFacturaPaperTemplateHtml,
  RuInvoiceFacturaPaperTemplateProps,
} from '@bigfin/pdf-templates';
import { GetSaleInvoice } from '@/modules/SaleInvoices/queries/GetSaleInvoice.service';
import { ChromiumlyTenancy } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { formatDateNumericRu } from '../utils/amountToWordsRu';
import {
  buildContactAddress,
  buildContactShippingAddress,
  buildOrganizationAddress,
  DASH,
  formatInnKpp,
  hasGoodsEntries,
  isSoleProprietorInn,
  joinRequisites,
  mapEntriesToRuVatLines,
} from '../utils/ruFormMapping';

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
    const metadata = tenant.metadata;

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
  const mapped = mapEntriesToRuVatLines(entries);
  const customer = invoice.customer;

  // Грузоотправителя и грузополучателя заполняют только при отгрузке
  // товаров; при оказании услуг в этих строках ставится прочерк.
  const shipsGoods = hasGoodsEntries(entries);

  return {
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

    isSoleProprietor: isSoleProprietorInn(metadata?.inn),
    soleProprietorOgrn: metadata?.ogrn ?? '',
  };
};
