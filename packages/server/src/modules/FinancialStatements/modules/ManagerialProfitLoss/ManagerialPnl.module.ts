// © 2026 Bigfin
import { Module } from '@nestjs/common';

import { FinancialSheetCommonModule } from '../../common/FinancialSheetCommon.module';
import { ManagementArticlesModule } from '@/modules/ManagementArticles/ManagementArticles.module';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { ManagerialPnlController } from './ManagerialPnl.controller';
import { ManagerialPnlApplication } from './ManagerialPnlApplication';
import { ManagerialPnlService } from './ManagerialPnlService';
import { ManagerialPnlSourceService } from './ManagerialPnlSource.service';

/**
 * Управленческий ОПиУ (FT-010 ТЗ-3) — от ярусов статей (`pl_type`), а не от
 * видов счетов. Бухгалтерский ОПиУ остаётся рядом как есть.
 */
@Module({
  imports: [FinancialSheetCommonModule, ManagementArticlesModule],
  controllers: [ManagerialPnlController],
  providers: [
    ManagerialPnlApplication,
    ManagerialPnlService,
    ManagerialPnlSourceService,
    TenancyContext,
  ],
})
export class ManagerialPnlModule {}
