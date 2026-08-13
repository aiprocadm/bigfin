// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import '@/utils/moment-mysql';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Notification } from '@/modules/Notifications/models/Notification.model';
import { MAX_FAILED_MAILS } from '../constants';

export interface FailedMailItem {
  firedAt: string;
  documentType: string;
  documentId: number | string | null;
  reason: string;
}

export interface FailedMailsResult {
  count: number;
  items: FailedMailItem[];
  /** Показано не больше MAX_FAILED_MAILS — усечение честно объявляется. */
  truncated: boolean;
}

/**
 * «Не отправленные письма» за последнюю неделю (шаг Ф4 карты v10).
 *
 * Каждое окончательное падение письма уже видно в ленте по одному (Ф1);
 * здесь — сводка для владельца: 22 упавшие задачи на стенде до этого
 * находились только прямым запросом в хранилище очередей, куда никто не
 * смотрит.
 */
@Injectable()
export class GetFailedMailsService {
  constructor(
    @Inject(Notification.name)
    private readonly notificationModel: TenantModelProxy<typeof Notification>,
  ) {}

  public async getFailedMails(): Promise<FailedMailsResult> {
    const weekAgo = moment().subtract(7, 'days').toMySqlDateTime();

    const rows: any[] = await this.notificationModel()
      .query()
      .onBuild((qb) => {
        qb.where('eventType', '=', 'mail_failed');
        qb.where('firedAt', '>=', weekAgo);
        qb.orderBy('firedAt', 'desc');
        qb.limit(MAX_FAILED_MAILS + 1);
      });

    const truncated = rows.length > MAX_FAILED_MAILS;
    const visible = truncated ? rows.slice(0, MAX_FAILED_MAILS) : rows;

    const items = visible.map((row) => {
      let payload: Record<string, any> = {};
      try {
        payload = row.payload ? JSON.parse(row.payload) : {};
      } catch {
        // Битая нагрузка не должна ронять сводку — покажем запись без деталей.
      }
      return {
        firedAt: row.firedAt,
        documentType: String(payload.documentType ?? ''),
        documentId: payload.documentId ?? null,
        reason: String(payload.reason ?? ''),
      };
    });

    return { count: rows.length, items, truncated };
  }
}
