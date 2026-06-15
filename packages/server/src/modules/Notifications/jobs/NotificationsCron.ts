// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Knex } from 'knex';
import { SystemKnexConnection } from '@/modules/System/SystemDB/SystemDB.constants';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { NOTIFICATIONS_QUEUE, NOTIFICATIONS_EVAL_JOB } from '../constants';

@Injectable()
export class NotificationsCron {
  constructor(
    @Inject(SystemKnexConnection) private readonly sysKnex: Knex,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  /**
   * Daily at 07:00 server time — enumerate all built tenants and enqueue
   * one per-tenant evaluation job. This method has NO CLS context; all
   * tenant-scoped work is done inside the processor.
   */
  @Cron('0 7 * * *')
  async dispatch() {
    const tenants: any[] = await TenantModel.bindKnex(this.sysKnex)
      .query()
      .whereNotNull('builtAt');

    for (const t of tenants) {
      await this.queue.add(NOTIFICATIONS_EVAL_JOB, {
        organizationId: t.organizationId,
      });
    }
  }
}
