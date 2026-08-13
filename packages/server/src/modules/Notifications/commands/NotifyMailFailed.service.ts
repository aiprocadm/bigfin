// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import * as moment from 'moment';
import '@/utils/moment-mysql';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Notification } from '../models/Notification.model';

/** Что писать в ленту о непроушедшем письме. */
export interface MailFailureDetails {
  /** Тип документа, по которому шло письмо (SaleInvoice, UserInvite, …). */
  documentType: string;
  documentId: number | string;
  /** Причина последней попытки — коротко, для человека. */
  reason: string;
}

/**
 * Окончательное падение письма попадает в ленту уведомлений (шаг Ф1 карты
 * v10).
 *
 * Повторы (Ф2) спасают от временных сбоев, но когда исчерпаны и они, человек
 * обязан узнать об этом из продукта, а не от контрагента через неделю. До
 * этого падение писалось только в консоль сервера, и в очередях стенда молча
 * скопились 22 потерянных письма.
 *
 * Вызывается из catch почтовых обработчиков — там контекст организации уже
 * установлен, поэтому тенантная модель ленты работает.
 */
@Injectable()
export class NotifyMailFailedService {
  constructor(
    @Inject(Notification.name)
    private readonly notificationModel: TenantModelProxy<typeof Notification>,
  ) {}

  /**
   * Пишет уведомление, только если попытка была последней.
   *
   * В момент обработки `attemptsMade` — число завершённых попыток ДО текущей
   * (проверено по исходникам BullMQ 5: инкремент после неудачи), поэтому
   * последняя попытка — это `attemptsMade + 1 >= attempts`.
   */
  public async notifyIfFinal(
    job: Job,
    details: MailFailureDetails,
  ): Promise<void> {
    const attempts = job.opts?.attempts ?? 1;
    const isFinal = job.attemptsMade + 1 >= attempts;

    if (!isFinal) return;

    // Одна задача — одна запись в ленте, сколько бы раз нас ни позвали.
    const dedupKey = `mail_failed:${job.queueName}:${job.id}`;

    try {
      const existing = await this.notificationModel()
        .query()
        .findOne('dedupKey', dedupKey);

      if (existing) return;

      await this.notificationModel()
        .query()
        .insert({
          eventType: 'mail_failed',
          // Запасной текст на случай отсутствия перевода: лента переводит
          // при выдаче по eventType, как у остальных событий.
          title: 'Письмо не отправлено',
          body: 'Не удалось отправить письмо. Проверьте настройки почты.',
          dedupKey,
          payload: JSON.stringify({
            documentType: details.documentType,
            documentId: details.documentId,
            reason: String(details.reason ?? '').slice(0, 200),
            queue: job.queueName,
          }),
          firedAt: moment().toMySqlDateTime(),
          channelsSent: JSON.stringify([]),
        } as any);
    } catch (error) {
      // Ошибка уведомления не должна маскировать настоящую ошибку письма:
      // обработчик обязан перебросить исходную, а не эту.
      console.error('[notifications] failed to record mail failure:', error);
    }
  }
}
