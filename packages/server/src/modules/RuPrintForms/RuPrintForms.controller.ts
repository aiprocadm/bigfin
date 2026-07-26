// © 2026 Bigfin
import { Response } from 'express';
import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetRuPaymentInvoicePdf } from './queries/GetRuPaymentInvoicePdf.service';
import { GetRuActPdf } from './queries/GetRuActPdf.service';
import { GetRuUpdPdf } from './queries/GetRuUpdPdf.service';
import { GetRuTorg12Pdf } from './queries/GetRuTorg12Pdf.service';
import { GetRuInvoiceFacturaPdf } from './queries/GetRuInvoiceFacturaPdf.service';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { SaleInvoiceAction } from '@/modules/SaleInvoices/SaleInvoice.types';
import { AcceptType } from '@/constants/accept-type';

/** Общие ответы Swagger для всех печатных форм. */
const FORM_API_RESPONSES = [
  { status: 200, description: 'PDF либо { htmlContent }.' },
  { status: 403, description: 'Модуль «Печатные формы РФ» выключен.' },
  { status: 404, description: 'The sale invoice not found.' },
];

const INVOICE_ID_PARAM = {
  name: 'id',
  required: true,
  type: Number,
  description: 'The sale invoice id',
};

/**
 * Печатные формы РФ (②c): счёт на оплату, акт, УПД, ТОРГ-12, счёт-фактура.
 * Все формы за флагом `ru_print_forms`.
 */
@Controller('ru-print-forms')
@ApiTags('ru-print-forms')
export class RuPrintFormsController {
  constructor(
    private readonly getRuPaymentInvoicePdfService: GetRuPaymentInvoicePdf,
    private readonly getRuActPdfService: GetRuActPdf,
    private readonly getRuUpdPdfService: GetRuUpdPdf,
    private readonly getRuTorg12PdfService: GetRuTorg12Pdf,
    private readonly getRuInvoiceFacturaPdfService: GetRuInvoiceFacturaPdf,
    private readonly featuresManager: FeaturesManager,
  ) {}

  /** Бросает 403, если модуль «Печатные формы РФ» выключен. */
  private async assertFeatureEnabled() {
    const enabled = await this.featuresManager.accessible(
      Features.RU_PRINT_FORMS,
    );
    if (!enabled) throw new ForbiddenException('Печатные формы РФ выключены');
  }

  /**
   * Общий ответ печатной формы: PDF при `Accept: application/pdf`,
   * иначе HTML-разметка для предпросмотра.
   */
  private async respondWithForm(
    acceptHeader: string,
    res: Response,
    renderPdf: () => Promise<[Buffer, string]>,
    renderHtml: () => Promise<string>,
  ) {
    await this.assertFeatureEnabled();

    if (!acceptHeader?.includes(AcceptType.ApplicationPdf)) {
      const htmlContent = await renderHtml();
      return { htmlContent };
    }
    const [pdfContent, filename] = await renderPdf();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfContent.length,
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    });
    res.send(pdfContent);
  }

  @Get('sale-invoices/:id/payment-invoice')
  @RequirePermission(SaleInvoiceAction.View, AbilitySubject.SaleInvoice)
  @ApiOperation({
    summary: 'Печатная форма РФ «Счёт на оплату» по счёту-продаже.',
  })
  @ApiParam(INVOICE_ID_PARAM)
  @ApiResponse(FORM_API_RESPONSES[0])
  @ApiResponse(FORM_API_RESPONSES[1])
  @ApiResponse(FORM_API_RESPONSES[2])
  async paymentInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept') acceptHeader: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithForm(
      acceptHeader,
      res,
      () => this.getRuPaymentInvoicePdfService.getPaymentInvoicePdf(id),
      () => this.getRuPaymentInvoicePdfService.getPaymentInvoiceHtml(id),
    );
  }

  @Get('sale-invoices/:id/act')
  @RequirePermission(SaleInvoiceAction.View, AbilitySubject.SaleInvoice)
  @ApiOperation({
    summary:
      'Печатная форма РФ «Акт выполненных работ (оказанных услуг)» по счёту-продаже.',
  })
  @ApiParam(INVOICE_ID_PARAM)
  @ApiResponse(FORM_API_RESPONSES[0])
  @ApiResponse(FORM_API_RESPONSES[1])
  @ApiResponse(FORM_API_RESPONSES[2])
  async act(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept') acceptHeader: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithForm(
      acceptHeader,
      res,
      () => this.getRuActPdfService.getActPdf(id),
      () => this.getRuActPdfService.getActHtml(id),
    );
  }

  @Get('sale-invoices/:id/upd')
  @RequirePermission(SaleInvoiceAction.View, AbilitySubject.SaleInvoice)
  @ApiOperation({
    summary:
      'Печатная форма РФ «Универсальный передаточный документ» (УПД, статус 1) по счёту-продаже.',
  })
  @ApiParam(INVOICE_ID_PARAM)
  @ApiResponse(FORM_API_RESPONSES[0])
  @ApiResponse(FORM_API_RESPONSES[1])
  @ApiResponse(FORM_API_RESPONSES[2])
  async upd(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept') acceptHeader: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithForm(
      acceptHeader,
      res,
      () => this.getRuUpdPdfService.getUpdPdf(id),
      () => this.getRuUpdPdfService.getUpdHtml(id),
    );
  }

  @Get('sale-invoices/:id/torg12')
  @RequirePermission(SaleInvoiceAction.View, AbilitySubject.SaleInvoice)
  @ApiOperation({
    summary:
      'Печатная форма РФ «Товарная накладная» (ТОРГ-12) по счёту-продаже.',
  })
  @ApiParam(INVOICE_ID_PARAM)
  @ApiResponse(FORM_API_RESPONSES[0])
  @ApiResponse(FORM_API_RESPONSES[1])
  @ApiResponse(FORM_API_RESPONSES[2])
  async torg12(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept') acceptHeader: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithForm(
      acceptHeader,
      res,
      () => this.getRuTorg12PdfService.getTorg12Pdf(id),
      () => this.getRuTorg12PdfService.getTorg12Html(id),
    );
  }

  @Get('sale-invoices/:id/invoice-factura')
  @RequirePermission(SaleInvoiceAction.View, AbilitySubject.SaleInvoice)
  @ApiOperation({
    summary: 'Печатная форма РФ «Счёт-фактура» по счёту-продаже.',
  })
  @ApiParam(INVOICE_ID_PARAM)
  @ApiResponse(FORM_API_RESPONSES[0])
  @ApiResponse(FORM_API_RESPONSES[1])
  @ApiResponse(FORM_API_RESPONSES[2])
  async invoiceFactura(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept') acceptHeader: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithForm(
      acceptHeader,
      res,
      () => this.getRuInvoiceFacturaPdfService.getInvoiceFacturaPdf(id),
      () => this.getRuInvoiceFacturaPdfService.getInvoiceFacturaHtml(id),
    );
  }
}
