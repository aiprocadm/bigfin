// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Knex } from 'knex';
import { SystemKnexConnection } from '@/modules/System/SystemDB/SystemDB.constants';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { TELEGRAM_ENTRIES_QUEUE, TELEGRAM_ENTRIES_JOB } from '../constants';

/**
 * ㉓ Каждые 5 минут обходит собранных тенантов и ставит по задаче на разбор
 * входящих сообщений Telegram. Тенантного контекста здесь нет — вся работа
 * с данными тенанта происходит в обработчике.
 */
@Injectable()
export class TelegramEntriesCron {
  constructor(
    @Inject(SystemKnexConnection) private readonly sysKnex: Knex,
    @InjectQueue(TELEGRAM_ENTRIES_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron('*/5 * * * *')
  async dispatch() {
    const tenants: any[] = await TenantModel.bindKnex(this.sysKnex)
      .query()
      .whereNotNull('builtAt');

    for (const t of tenants) {
      await this.queue.add(TELEGRAM_ENTRIES_JOB, {
        organizationId: t.organizationId,
      });
    }
  }
}
