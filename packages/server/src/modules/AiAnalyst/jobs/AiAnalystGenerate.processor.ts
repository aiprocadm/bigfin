// © 2026 Bigfin
import { Logger, Scope } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ClsService, UseCls } from 'nestjs-cls';

import { AI_ANALYST_QUEUE } from '../constants';
import { AI_SCOPES, AiScope, GetAiInsightsService } from '../queries/GetAiInsights.service';

/**
 * Формирование выводов одной организации (этап 13 ТЗ, §13.3).
 *
 * Флаг и настройки проверяются ЗДЕСЬ, а не в расписании: у расписания нет
 * контекста организации, и её настройки оттуда не прочитать.
 */
@Processor({ name: AI_ANALYST_QUEUE, scope: Scope.REQUEST })
export class AiAnalystGenerateProcessor extends WorkerHost {
  private readonly logger = new Logger(AiAnalystGenerateProcessor.name);

  constructor(
    private readonly cls: ClsService,
    private readonly insights: GetAiInsightsService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job<{ organizationId: string }>) {
    this.cls.set('organizationId', job.data.organizationId);

    const availability = await this.insights.getAvailability();

    if (!availability.available) {
      // Выход без ошибки: выключенный раздел — это норма, а не сбой.
      return { skipped: availability.reason };
    }

    const done: Record<string, unknown> = {};

    for (const scope of Object.keys(AI_SCOPES) as AiScope[]) {
      try {
        done[scope] = await this.insights.generate(scope);
      } catch (error) {
        // Сбой одного раздела НЕ должен ронять остальные: модель могла
        // не ответить на один запрос, а выводы по другим отчётам нужны.
        // В журнал идёт только название раздела и текст ошибки — данных
        // организации здесь нет и быть не должно.
        this.logger.error(
          `ИИ-аналитик: раздел «${scope}» не сформирован — ${
            (error as Error)?.message ?? 'неизвестная ошибка'
          }`,
        );
        done[scope] = { failed: true };
      }
    }
    return done;
  }
}
