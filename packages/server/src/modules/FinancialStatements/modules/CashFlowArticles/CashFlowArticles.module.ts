// © 2026 Bigfin
import { Module } from '@nestjs/common';

import { FinancialSheetCommonModule } from '../../common/FinancialSheetCommon.module';
import { ManagementArticlesModule } from '@/modules/ManagementArticles/ManagementArticles.module';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { CashFlowArticlesController } from './CashFlowArticles.controller';
import { CashFlowArticlesApplication } from './CashFlowArticlesApplication';
import { CashFlowArticlesService } from './CashFlowArticlesService';
import { CashFlowArticlesTableInjectable } from './CashFlowArticlesTableInjectable';
import { CashFlowArticlesExport } from './CashFlowArticlesExport';
import { CashFlowArticlesPdfInjectable } from './CashFlowArticlesPdfInjectable';
import { CashFlowArticlesMeta } from './CashFlowArticlesMeta';

/**
 * Отчёт о движении денег ПРЯМЫМ методом (FIN-013 ТЗ-2).
 *
 * Расчёт берётся у модуля статей — он же питает график на главной. Именно
 * поэтому график и таблица показывают одно и то же: считает их один код.
 */
@Module({
  imports: [FinancialSheetCommonModule, ManagementArticlesModule],
  controllers: [CashFlowArticlesController],
  providers: [
    CashFlowArticlesApplication,
    CashFlowArticlesService,
    CashFlowArticlesTableInjectable,
    CashFlowArticlesExport,
    CashFlowArticlesPdfInjectable,
    CashFlowArticlesMeta,
    TenancyContext,
  ],
})
export class CashFlowArticlesModule {}
