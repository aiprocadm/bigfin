// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { VatAnalysisController } from './VatAnalysis.controller';
import { GetVatSummaryService } from './GetVatSummary.service';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';

/**
 * ㉖ Анализ НДС: сводка «начислен / к вычету / к уплате» за период из ГЛ
 * по счетам `tax-payable`. За флагом `vat_analysis`.
 */
@Module({
  imports: [FeaturesModule, TenancyModule],
  controllers: [VatAnalysisController],
  providers: [GetVatSummaryService],
})
export class VatAnalysisModule {}
