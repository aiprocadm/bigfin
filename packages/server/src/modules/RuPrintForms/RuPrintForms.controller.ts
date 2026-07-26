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
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { SaleInvoiceAction } from '@/modules/SaleInvoices/SaleInvoice.types';
import { AcceptType } from '@/constants/accept-type';

/**
 * Печатные формы РФ (②c). Фаза 1 — «Счёт на оплату» по счёту-продаже.
 * За флагом `ru_print_forms`.
 */
@Controller('ru-print-forms')
@ApiTags('ru-print-forms')
export class RuPrintFormsController {
  constructor(
    private readonly getRuPaymentInvoicePdfService: GetRuPaymentInvoicePdf,
    private readonly featuresManager: FeaturesManager,
  ) {}

  @Get('sale-invoices/:id/payment-invoice')
  @RequirePermission(SaleInvoiceAction.View, AbilitySubject.SaleInvoice)
  @ApiOperation({
    summary: 'Печатная форма РФ «Счёт на оплату» по счёту-продаже.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'The sale invoice id',
  })
  @ApiResponse({ status: 200, description: 'PDF либо { htmlContent }.' })
  @ApiResponse({ status: 403, description: 'Модуль «Печатные формы РФ» выключен.' })
  @ApiResponse({ status: 404, description: 'The sale invoice not found.' })
  async paymentInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept') acceptHeader: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const enabled = await this.featuresManager.accessible(
      Features.RU_PRINT_FORMS,
    );
    if (!enabled) throw new ForbiddenException('Печатные формы РФ выключены');

    if (acceptHeader?.includes(AcceptType.ApplicationPdf)) {
      const [pdfContent, filename] =
        await this.getRuPaymentInvoicePdfService.getPaymentInvoicePdf(id);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfContent.length,
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      });
      res.send(pdfContent);
    } else {
      const htmlContent =
        await this.getRuPaymentInvoicePdfService.getPaymentInvoiceHtml(id);
      return { htmlContent };
    }
  }
}
