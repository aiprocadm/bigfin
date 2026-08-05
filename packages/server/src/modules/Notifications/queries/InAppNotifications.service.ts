// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import * as moment from 'moment';
import '@/utils/moment-mysql';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Notification } from '../models/Notification.model';
import { NotificationRead } from '../models/NotificationRead.model';
import { FEED_WINDOW_DAYS } from '../constants';
import { markReadFlags, NotificationRow } from '../utils/inAppRead';
import { insertMany } from '@/utils/insert-many';

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

  /**
   * Граница ленты: показываем и считаем только уведомления за последние
   * FEED_WINDOW_DAYS дней. Одно и то же окно в list() и unreadCount() держит
   * бейдж и выпадашку согласованными и не даёт COUNT расти вместе с историей.
   */
  private feedCutoff(): string {
    return moment().subtract(FEED_WINDOW_DAYS, 'days').toMySqlDateTime();
  }

  /** Последние N уведомлений (в пределах окна) с персональным флагом read. */
  async list(limit = 20) {
    const userId = this.userId();
    const notifs: any[] = await this.notifModel()
      .query()
      .where('firedAt', '>=', this.feedCutoff())
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
   * Число непрочитанных текущим пользователем в пределах окна ленты.
   *
   * Считается целиком в БД анти-джойном: notifications LEFT JOIN
   * notification_reads (по этому пользователю) WHERE reads.id IS NULL. Раньше
   * метод тянул в память ВСЕ id уведомлений и ВСЕ прочитанные id и вычитал их
   * в JS — на каждый поллинг (раз в 60с на пользователя) и при безгранично
   * растущей таблице это тысячи строк в минуту. Теперь из БД возвращается
   * только итоговое число.
   */
  async unreadCount() {
    const userId = this.userId();
    const row: any = await this.notifModel()
      .query()
      .leftJoin('notification_reads', (join) =>
        join
          .on('notification_reads.notificationId', '=', 'notifications.id')
          .andOnVal('notification_reads.userId', '=', userId),
      )
      .where('notifications.firedAt', '>=', this.feedCutoff())
      .whereNull('notification_reads.id')
      .count('notifications.id as count')
      .first();
    return { count: Number(row?.count ?? 0) };
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

  /** Отметить все ещё непрочитанные текущим пользователем (в пределах окна). */
  async markAllRead() {
    const userId = this.userId();

    // Тем же анти-джойном забираем из БД только id ещё не прочитанных
    // уведомлений в пределах окна — вместо загрузки всей истории и вычитания
    // множеств в JS. Окно совпадает с unreadCount(), поэтому «Прочитать всё»
    // гасит ровно то, что считает бейдж.
    const unread: any[] = await this.notifModel()
      .query()
      .leftJoin('notification_reads', (join) =>
        join
          .on('notification_reads.notificationId', '=', 'notifications.id')
          .andOnVal('notification_reads.userId', '=', userId),
      )
      .where('notifications.firedAt', '>=', this.feedCutoff())
      .whereNull('notification_reads.id')
      .select('notifications.id as id');

    if (!unread.length) return { success: true };

    const now = moment().toMySqlDateTime();
    const toInsert = unread.map((n) => ({
      notificationId: n.id,
      userId,
      readAt: now,
    }));

    // Пишем через knex: список строк Objection вставляет только в
    // PostgreSQL/SQL Server, а у нас MySQL — отметка «прочитать все» падала
    // в 500. INSERT IGNORE: гонка с конкурентной отметкой безопасна.
    await insertMany(this.readModel().knex(), NotificationRead.tableName, toInsert, {
      onConflict: ['notificationId', 'userId'],
      conflict: 'ignore',
    });

    return { success: true };
  }
}
