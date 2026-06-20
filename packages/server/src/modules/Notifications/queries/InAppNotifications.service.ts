// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import * as moment from 'moment';
import '@/utils/moment-mysql';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Notification } from '../models/Notification.model';
import { NotificationRead } from '../models/NotificationRead.model';
import {
  markReadFlags,
  countUnread,
  selectUnreadIds,
  NotificationRow,
} from '../utils/inAppRead';

@Injectable()
export class InAppNotificationsService {
  constructor(
    private readonly cls: ClsService,
    @Inject(Notification.name)
    private readonly notifModel: TenantModelProxy<typeof Notification>,
    @Inject(NotificationRead.name)
    private readonly readModel: TenantModelProxy<typeof NotificationRead>,
  ) {}

  private userId(): number {
    return Number(this.cls.get('userId'));
  }

  /** Последние N уведомлений с персональным флагом read. */
  async list(limit = 20) {
    const userId = this.userId();
    const notifs: any[] = await this.notifModel()
      .query()
      .orderBy('firedAt', 'desc')
      .limit(limit);

    const ids = notifs.map((n) => n.id);
    const reads: any[] = ids.length
      ? await this.readModel()
          .query()
          .where('userId', userId)
          .whereIn('notificationId', ids)
      : [];

    const rows: NotificationRow[] = notifs.map((n) => ({
      id: n.id,
      eventType: n.eventType,
      title: n.title,
      body: n.body,
      payload: n.payload,
      firedAt: n.firedAt,
    }));

    return {
      notifications: markReadFlags(
        rows,
        reads.map((r) => r.notificationId),
      ),
    };
  }

  /** Число непрочитанных текущим пользователем. */
  async unreadCount() {
    const userId = this.userId();
    const notifs: any[] = await this.notifModel().query().select('id');
    const reads: any[] = await this.readModel()
      .query()
      .where('userId', userId)
      .select('notificationId');
    return {
      count: countUnread(
        notifs.map((n) => n.id),
        reads.map((r) => r.notificationId),
      ),
    };
  }

  /** Отметить одно уведомление прочитанным (идемпотентно). */
  async markRead(id: number) {
    const userId = this.userId();
    const notif = await this.notifModel().query().findById(id);
    if (!notif) throw new NotFoundException('notification_not_found');

    const existing = await this.readModel()
      .query()
      .where('userId', userId)
      .andWhere('notificationId', id)
      .first();

    if (!existing) {
      await this.readModel().query().insert({
        notificationId: id,
        userId,
        readAt: moment().toMySqlDateTime(),
      } as any);
    }
    return { success: true };
  }

  /** Отметить все ещё непрочитанные текущим пользователем. */
  async markAllRead() {
    const userId = this.userId();
    const notifs: any[] = await this.notifModel().query().select('id');
    const reads: any[] = await this.readModel()
      .query()
      .where('userId', userId)
      .select('notificationId');

    const now = moment().toMySqlDateTime();
    const toInsert = selectUnreadIds(
      notifs.map((n) => n.id),
      reads.map((r) => r.notificationId),
    ).map((notificationId) => ({ notificationId, userId, readAt: now }));

    if (toInsert.length) {
      await this.readModel().query().insert(toInsert as any);
    }
    return { success: true };
  }
}
