import { Module } from '@nestjs/common';
import { ARAgingSummaryTableInjectable } from './ARAgingSummaryTableInjectable';
import { ARAgingSummaryExportInjectable } from './ARAgingSummaryExportInjectable';
import { ARAgingSummaryService } from './ARAgingSummaryService';
import { ARAgingSummaryPdfInjectable } from './ARAgingSummaryPdfInjectable';
import { AgingSummaryModule } from '../AgingSummary/AgingSummary.module';
import { ARAgingSummaryRepository } from './ARAgingSummaryRepository';
import { ARAgingSummaryApplication } from './ARAgingSummaryApplication';
import { ARAgingSummaryController } from './ARAgingSummary.controller';
import { ARAgingSummaryMeta } from './ARAgingSummaryMeta';
import { FinancialSheetCommonModule } from '../../common/FinancialSheetCommon.module';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

@Module({
  imports: [AgingSummaryModule, FinancialSheetCommonModule],
  controllers: [ARAgingSummaryController],
  providers: [
    ARAgingSummaryTableInjectable,
    ARAgingSummaryExportInjectable,
    ARAgingSummaryService,
    ARAgingSummaryPdfInjectable,
    ARAgingSummaryRepository,
    ARAgingSummaryApplication,
    ARAgingSummaryMeta,
    TenancyContext,
  ],
  // Наружу для сводки «как дела с деньгами» на главной (Г2 карты v20):
  // она берёт долги из этого же отчёта, а не считает их заново.
  exports: [ARAgingSummaryService],
})
export class ARAgingSummaryModule {}
