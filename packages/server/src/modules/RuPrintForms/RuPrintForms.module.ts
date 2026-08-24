// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { RuPrintFormsController } from './RuPrintForms.controller';
import { GetRuPaymentInvoicePdf } from './queries/GetRuPaymentInvoicePdf.service';
import { GetRuActPdf } from './queries/GetRuActPdf.service';
import { GetRuUpdPdf } from './queries/GetRuUpdPdf.service';
import { GetRuTorg12Pdf } from './queries/GetRuTorg12Pdf.service';
import { GetRuInvoiceFacturaPdf } from './queries/GetRuInvoiceFacturaPdf.service';
import { GetRuReconciliationActPdf } from './queries/GetRuReconciliationActPdf.service';
import { TransactionsByCustomerModule } from '@/modules/FinancialStatements/modules/TransactionsByCustomer/TransactionsByCustomer.module';
import { CustomersModule } from '@/modules/Customers/Customers.module';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { ChromiumlyTenancyModule } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.module';
import { SaleInvoicesModule } from '@/modules/SaleInvoices/SaleInvoices.module';
import { RolesModule } from '../Roles/Roles.module';

/**
 * ②c Печатные формы РФ: счёт на оплату, акт, УПД, ТОРГ-12, счёт-фактура,
 * акт сверки взаимных расчётов (К2 карты v19).
 * За флагом `ru_print_forms`. Дизайн: docs/superpowers/specs/2026-07-26-ru-print-forms-design.md
 */
@Module({
  imports: [
    // Ради стражей прав на контроллере.
    RolesModule,
    FeaturesModule,
    TenancyModule,
    ChromiumlyTenancyModule,
    SaleInvoicesModule,
    // Акт сверки берёт обороты из того же отчёта, что показывает раздел
    // «Обороты по покупателю»: второго способа считать сальдо быть не должно
    // (К2 карты v19).
    TransactionsByCustomerModule,
    CustomersModule,
  ],
  controllers: [RuPrintFormsController],
  providers: [
    GetRuPaymentInvoicePdf,
    GetRuActPdf,
    GetRuUpdPdf,
    GetRuTorg12Pdf,
    GetRuInvoiceFacturaPdf,
    GetRuReconciliationActPdf,
  ],
})
export class RuPrintFormsModule {}
