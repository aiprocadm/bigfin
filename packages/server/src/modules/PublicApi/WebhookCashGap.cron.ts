// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Knex } from 'knex';

import { SystemKnexConnection } from '@/modules/System/SystemDB/SystemDB.constants';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { WEBHOOK_CASH_GAP_JOB, WEBHOOKS_QUEUE } from './WebhookDispatcher.service';

/**
 * Ежедневная проверка «в прогнозе кассовый разрыв» для вебхука
 * `cash_gap.forecasted` (FT-092 ТЗ-3). Каждой организации — своя задача:
 * у расписания нет контекста организации. Подписок нет — задача ничего не
 * отправит.
 *
 * 7:45 — после утренних уведомлений, чтобы разрыв в вебхуке и в письме
 * считался по одним данным.
 */
@Injectable()
export class WebhookCashGapCron {
  constructor(
    @Inject(SystemKnexConnection) private readonly sysKnex: Knex,
    @InjectQueue(WEBHOOKS_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron('45 7 * * *')
  async dispatch() {
    const tenants: any[] = await TenantModel.bindKnex(this.sysKnex).query().whereNotNull('builtAt');
    for (const tenant of tenants) {
      await this.queue.add(WEBHOOK_CASH_GAP_JOB, { organizationId: tenant.organizationId }, { removeOnComplete: true });
    }
  }
}
