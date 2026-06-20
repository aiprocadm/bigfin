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

  /**
   * Число непрочитанных текущим пользователем — по ВСЕЙ истории (в отличие от
   * list(), который отдаёт последние 20). Поэтому бейдж может быть больше, чем
   * видно в выпадашке; такие «хвостовые» уведомления гасятся «Прочитать всё».
   */
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

    // Идемпотентность на уровне БД: INSERT IGNORE по UNIQUE(notificationId,
    // userId). Повторный клик/гонка с поллингом — тихий no-op, не 500.
    await this.readModel()
      .query()
      .insert({
        notificationId: id,
        userId,
        readAt: moment().toMySqlDateTime(),
      } as any)
      .onConflict(['notificationId', 'userId'])
      .ignore();

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
      // INSERT IGNORE: гонка с конкурентной отметкой не падает в 500.
      await this.readModel()
        .query()
        .insert(toInsert as any)
        .onConflict(['notificationId', 'userId'])
        .ignore();
    }
    return { success: true };
  }
}
