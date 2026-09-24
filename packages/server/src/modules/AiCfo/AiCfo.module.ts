// © 2026 Bigfin
import { Module } from '@nestjs/common';

import { AiAnalystModule } from '@/modules/AiAnalyst/AiAnalyst.module';
import { ChromiumlyTenancyModule } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.module';

import { AiCfoController } from './AiCfo.controller';
import { AiCfoService } from './AiCfo.service';
import { AiCfoDataClient } from './AiCfoData.client';
import { AiCfoMemoService } from './AiCfoMemo.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

/**
 * AI CFO (FT-100…FT-102 ТЗ-3). Настройки модели и правила приватности — из
 * `AiAnalystModule`: второй набор настроек одного ИИ — второе место, где можно
 * забыть выключить отправку данных наружу.
 */
@Module({
  imports: [AiAnalystModule, ChromiumlyTenancyModule],
  controllers: [AiCfoController],
  providers: [AiCfoService, AiCfoDataClient, AiCfoMemoService, TenancyContext],
  exports: [AiCfoService],
})
export class AiCfoModule {}
