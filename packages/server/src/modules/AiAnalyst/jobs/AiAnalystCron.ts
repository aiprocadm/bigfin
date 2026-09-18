// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Knex } from 'knex';

import { SystemKnexConnection } from '@/modules/System/SystemDB/SystemDB.constants';
import { TenantModel } from '@/modules/System/models/TenantModel';

import { AI_ANALYST_QUEUE, AI_ANALYST_GENERATE_JOB } from '../constants';

/**
 * Суточное формирование выводов (этап 13 ТЗ, §13.3).
 *
 * ТЗ прямо: «Формируется раз в сутки фоновой задачей, кешируется. Не по
 * запросу — иначе дорого и медленно». Открытие главной страницы не должно ни
 * ждать модель, ни оплачивать её.
 *
 * Время — 5 утра: ночной прогон успевает до начала рабочего дня, а сам
 * запуск не совпадает с семью часами, когда рассылаются уведомления (два
 * тяжёлых обхода всех организаций подряд ни к чему).
 */
@Injectable()
export class AiAnalystCron {
  constructor(
    @Inject(SystemKnexConnection) private readonly sysKnex: Knex,
    @InjectQueue(AI_ANALYST_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron('0 5 * * *')
  async dispatch() {
    const tenants: any[] = await TenantModel.bindKnex(this.sysKnex)
      .query()
      .whereNotNull('builtAt');

    for (const tenant of tenants) {
      // Задача ставится каждой организации, а флаг проверяется ВНУТРИ:
      // здесь нет контекста организации, и прочитать её настройки отсюда
      // нечем. Обработчик с выключенным флагом выходит сразу.
      await this.queue.add(AI_ANALYST_GENERATE_JOB, {
        organizationId: tenant.organizationId,
      });
    }
  }
}
