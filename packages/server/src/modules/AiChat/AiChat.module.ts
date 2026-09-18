// © 2026 Bigfin
import { Module } from '@nestjs/common';

import { AiAnalystModule } from '@/modules/AiAnalyst/AiAnalyst.module';
import { ManagementArticlesModule } from '@/modules/ManagementArticles/ManagementArticles.module';

import { AiChatController } from './AiChat.controller';
import { AiChatService } from './AiChat.service';
import { ChatToolRunner } from './ChatToolRunner.service';

/**
 * ИИ-чат по финансам (этап 14 ТЗ).
 *
 * Настройки, провайдер и правила приватности берутся из `AiAnalystModule`, а
 * не заводятся свои: два набора настроек одного и того же ИИ — это два места,
 * где можно забыть выключить отправку данных наружу.
 */
@Module({
  imports: [AiAnalystModule, ManagementArticlesModule],
  controllers: [AiChatController],
  providers: [AiChatService, ChatToolRunner],
  exports: [AiChatService],
})
export class AiChatModule {}
