// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import {
  renderRuActPaperTemplateHtml,
  RuActPaperTemplateProps,
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
 * Печатная форма РФ «Акт выполненных работ (оказанных услуг)» по счёту-продаже.
 * Номер и дата акта совпадают с номером и датой счёта (типовая практика
 * для услуг: счёт и акт оформляются на одну операцию).
 */
@Injectable()
export class GetRuActPdf {
  constructor(
    private readonly chromiumlyTenancy: ChromiumlyTenancy,
    private readonly getInvoiceService: GetSaleInvoice,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * HTML печатной формы (для превью и отладки).
   */
  public async getActHtml(invoiceId: number): Promise<string> {
    const props = await this.getActProps(invoiceId);
    return renderRuActPaperTemplateHtml(props);
  }

  /**
   * PDF печатной формы.
   * @returns {Promise<[Buffer, string]>} [содержимое, имя файла]
   */
  public async getActPdf(invoiceId: number): Promise<[Buffer, string]> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const htmlContent = await this.getActHtml(invoiceId);
    const buffer = await this.chromiumlyTenancy.convertHtmlContent(htmlContent);

    return [buffer, `Akt-${invoice.invoiceNo}`];
  }

  /**
   * Собирает данные шаблона из счёта и реквизитов организации.
   */
  public async getActProps(invoiceId: number): Promise<RuActPaperTemplateProps> {
    const invoice = await this.getInvoiceService.getSaleInvoice(invoiceId);
    const tenant = await this.tenancyContext.getTenant(true);
    const metadata = tenant.metadata;

    return transformToRuActProps(invoice, metadata);
  }
}

/**
 * Чистый маппинг «счёт + метаданные организации → props шаблона акта».
 */
export const transformToRuActProps = (
  invoice: any,
  metadata: any,
): RuActPaperTemplateProps => {
  const entries = invoice.entries || [];

  return {
    ...buildSignerProps(metadata),

    documentNumber: invoice.invoiceNo ?? '',
    documentDate: formatDateRu(invoice.invoiceDate),

    sellerLine: buildSellerLine(metadata),
    buyerLine: buildBuyerLine(invoice.customer),

    lines: mapEntriesToRuFormLines(entries),
    itemsCount: entries.length,

    ...buildRuFormTotals(invoice),
  };
};
