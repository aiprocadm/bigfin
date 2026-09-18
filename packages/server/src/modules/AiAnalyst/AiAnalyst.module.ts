// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { FeaturesModule } from '@/modules/Features/Features.module';
import { ManagementArticlesModule } from '@/modules/ManagementArticles/ManagementArticles.module';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { AI_ANALYST_QUEUE } from './constants';
import { AiAnalystController } from './AiAnalyst.controller';
import { AiAnalystSettingsService } from './AiAnalystSettings.service';
import { GetAiInsightsService } from './queries/GetAiInsights.service';
import { AiAnalystCron } from './jobs/AiAnalystCron';
import { AiAnalystGenerateProcessor } from './jobs/AiAnalystGenerate.processor';

/**
 * ИИ-аналитик (этап 13 ТЗ).
 *
 * Свёртка статей берётся из `ManagementArticlesModule`, а не считается здесь
 * заново: §13.1 п. 1 требует, чтобы все числа приходили из уже посчитанных
 * агрегатов. Второй расчёт рано или поздно разошёлся бы с отчётом — и тогда
 * текст под отчётом противоречил бы самому отчёту.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: AI_ANALYST_QUEUE }),
    FeaturesModule,
    ManagementArticlesModule,
  ],
  controllers: [AiAnalystController],
  providers: [
    AiAnalystSettingsService,
    GetAiInsightsService,
    AiAnalystCron,
    AiAnalystGenerateProcessor,
    TenancyContext,
  ],
  exports: [GetAiInsightsService, AiAnalystSettingsService],
})
export class AiAnalystModule {}
