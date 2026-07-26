// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import {
  renderRuTorg12PaperTemplateHtml,
  RuTorg12PaperTemplateProps,
} from '@bigfin/pdf-templates';
import { GetSaleInvoice } from '@/modules/SaleInvoices/queries/GetSaleInvoice.service';
import { ChromiumlyTenancy } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  formatDateNumericRu,
  integerToWordsRu,
} from '../utils/amountToWordsRu';
import {
  buildAmountInWords,
  buildContactAddress,
  buildContactRequisitesLine,
  buildContactShippingAddress,
  buildOrgRequisitesLine,
  mapEntriesToRuVatLines,
} from '../utils/ruFormMapping';

/**
 * Печатная форма РФ «Товарная накладная» (ТОРГ-12) по счёту-продаже.
 * Печатается в альбомной ориентации.
 */
@Injectable()
export class GetRuTorg12Pdf {
  constructor(
    private readonly chromiumlyTenancy: ChromiumlyTenancy,
    private readonly getInvoiceService: GetSaleInvoice,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * HTML печатной формы (для превью и отладки).
   */
  public async getTorg12Html(invoiceId: number): Promise<string> {
    const props = await this.getTorg12Props(invoiceId);
    return renderRuTorg12PaperTemplateHtml(props);
  }

  /**
   * PDF печатной формы (альбомная ориентация).
   * @returns {Promise<[Buffer, string]>} [содержимое, имя файла]
   */
  public async getTorg12Pdf(invoiceId: number): Promise<[Buffer, string]> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const htmlContent = await this.getTorg12Html(invoiceId);
    const buffer = await this.chromiumlyTenancy.convertHtmlContent(htmlContent, {
      landscape: true,
    });

    return [buffer, `TORG12-${invoice.invoiceNo}`];
  }

  /**
   * Собирает данные шаблона из счёта и реквизитов организации.
   */
  public async getTorg12Props(
    invoiceId: number,
  ): Promise<RuTorg12PaperTemplateProps> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const tenant = await this.tenancyContext.getTenant(true);
    const metadata = tenant.metadata;

    return transformToRuTorg12Props(invoice, metadata);
  }
}

/**
 * Чистый маппинг «счёт + метаданные организации → props шаблона ТОРГ-12».
 */
export const transformToRuTorg12Props = (
  invoice: any,
  metadata: any,
): RuTorg12PaperTemplateProps => {
  const mapped = mapEntriesToRuVatLines(invoice.entries || []);
  const customer = invoice.customer;

  // Организация выступает и грузоотправителем, и поставщиком;
  // контрагент — и грузополучателем (адрес доставки), и плательщиком.
  const organizationLine = buildOrgRequisitesLine(metadata);

  return {
    documentNumber: invoice.invoiceNo ?? '',
    documentDate: formatDateNumericRu(invoice.invoiceDate),

    shipperLine: organizationLine,
    structuralUnit: '',
    consigneeLine: buildContactRequisitesLine(
      customer,
      buildContactShippingAddress(customer),
    ),
    supplierLine: organizationLine,
    payerLine: buildContactRequisitesLine(
      customer,
      buildContactAddress(customer),
    ),

    // Основанием служит договор, если у счёта заполнена ссылка на него,
    // иначе сам счёт.
    basisName: invoice.referenceNo ? 'Договор' : 'Счёт',
    basisNumber: invoice.referenceNo ?? invoice.invoiceNo ?? '',
    basisDate: formatDateNumericRu(invoice.invoiceDate),

    lines: mapped.lines.map((line) => ({
      index: line.index,
      title: line.title,
      code: line.code,
      quantity: line.quantityText,
      price: line.priceExclVatText,
      amountExclVat: line.amountExclVatText,
      vatRate: line.vatRateText,
      vatAmount: line.vatAmountText,
      amountInclVat: line.amountInclVatText,
    })),

    totalQuantity: mapped.totalQuantityText,
    totalAmountExclVat: mapped.totalExclVatText,
    totalVatAmount: mapped.totalVatText,
    totalAmountInclVat: mapped.totalInclVatText,

    entriesCountInWords: integerToWordsRu(mapped.lines.length),
    totalInWords: buildAmountInWords(mapped.totalInclVat, invoice.currencyCode),
  };
};
