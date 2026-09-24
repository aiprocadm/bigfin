// © 2026 Bigfin
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClsService } from 'nestjs-cls';

import { ReportCacheService } from './ReportCache.service';
import { invalidatingEventNames } from './utils/invalidationMap';

/**
 * Второй слой сброса кэша (FT-093 ТЗ-3): события изменения данных, которые
 * приходят без запроса человека — синхронизация банка, разбор выписки в
 * очереди, задачи по расписанию.
 *
 * Сброс дважды: сразу и после записи транзакции. Сразу — чтобы отчёт,
 * запрошенный в эту секунду, не лёг в кэш со старыми числами под новым
 * поколением; после записи — на случай, если такой отчёт успели посчитать
 * между событием и фиксацией.
 */
@Injectable()
export class ReportCacheInvalidationSubscriber implements OnModuleInit {
  constructor(
    private readonly emitter: EventEmitter2,
    private readonly cache: ReportCacheService,
    private readonly cls: ClsService,
  ) {}

  onModuleInit() {
    for (const name of invalidatingEventNames()) {
      this.emitter.on(name, (payload: any) => this.onDataChanged(payload));
    }
  }

  public async onDataChanged(payload: any): Promise<void> {
    const organizationId = this.organizationId(payload);
    // Без организации сбросить нечего — кэш доживёт свои 15 минут.
    if (!organizationId) return;
    await this.cache.invalidate(organizationId);
    const trx = payload?.trx;
    if (trx?.executionPromise) {
      trx.executionPromise
        .then(() => this.cache.invalidate(organizationId))
        .catch(() => undefined);
    }
  }

  private organizationId(payload: any): string | null {
    try {
      const fromCls = this.cls.isActive() ? this.cls.get('organizationId') : null;
      return fromCls ? String(fromCls) : payload?.organizationId ? String(payload.organizationId) : null;
    } catch {
      return null;
    }
  }
}
