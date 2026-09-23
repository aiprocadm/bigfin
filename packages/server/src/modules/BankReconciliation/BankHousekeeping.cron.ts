// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Knex } from 'knex';

import { SystemKnexConnection } from '@/modules/System/SystemDB/SystemDB.constants';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { BANK_HOUSEKEEPING_JOB, RECONCILIATION_QUEUE } from './BankReconciliation.service';

/**
 * Ежедневная уборка банковских данных (FT-040, FT-042 ТЗ-3): корзина
 * хранит операции 90 дней, история сверок — 180. Каждой организации — своя
 * задача: у расписания нет контекста организации.
 *
 * 3:30 — ночью, до пятичасовой задачи ИИ-аналитика и семичасовых
 * уведомлений: тяжёлые обходы всех организаций не должны совпадать.
 */
@Injectable()
export class BankHousekeepingCron {
  constructor(
    @Inject(SystemKnexConnection) private readonly sysKnex: Knex,
    @InjectQueue(RECONCILIATION_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron('30 3 * * *')
  async dispatch() {
    const tenants: any[] = await TenantModel.bindKnex(this.sysKnex)
      .query()
      .whereNotNull('builtAt');
    for (const tenant of tenants) {
      await this.queue.add(BANK_HOUSEKEEPING_JOB, { organizationId: tenant.organizationId });
    }
  }
}
