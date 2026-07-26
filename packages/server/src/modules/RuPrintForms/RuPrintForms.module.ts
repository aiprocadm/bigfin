// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { RuPrintFormsController } from './RuPrintForms.controller';
import { GetRuPaymentInvoicePdf } from './queries/GetRuPaymentInvoicePdf.service';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { ChromiumlyTenancyModule } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.module';
import { SaleInvoicesModule } from '@/modules/SaleInvoices/SaleInvoices.module';

/**
 * ②c Печатные формы РФ. Фаза 1 — «Счёт на оплату».
 * За флагом `ru_print_forms`. Дизайн: docs/superpowers/specs/2026-07-26-ru-print-forms-design.md
 */
@Module({
  imports: [
    FeaturesModule,
    TenancyModule,
    ChromiumlyTenancyModule,
    SaleInvoicesModule,
  ],
  controllers: [RuPrintFormsController],
  providers: [GetRuPaymentInvoicePdf],
})
export class RuPrintFormsModule {}
