// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  buildNotificationArgs,
  NotificationFormatContext,
} from './utils/notificationArgs';

export interface RenderedNotification {
  title: string;
  body: string;
  footer: string;
}

/**
 * Готовые тексты уведомления на языке организации.
 *
 * Единая точка для всех потребителей — email, telegram и in-app ленты:
 * один и тот же перевод, одни и те же подстановки (см. notificationArgs).
 * До этого каждый канал переводил сам, а лента вообще отдавала сырые ключи
 * (`cash_gap.title`) — приёмка ㉒ это и вскрыла.
 */
@Injectable()
export class NotificationTextsService {
  constructor(
    private readonly orgI18n: OrganizationI18nService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  private async formatContext(): Promise<NotificationFormatContext> {
    const [locale, metadata] = await Promise.all([
      this.orgI18n.getLanguage(),
      this.tenancyContext.getTenantMetadata(),
    ]);
    return { locale, currencyCode: metadata?.baseCurrency ?? 'USD' };
  }

  /**
   * Переводит title/body/footer события с подстановками из payload.
   * Для неизвестного события (нет ключа в переводах) возвращает null —
   * вызывающий решает, чем заменить (лента падает на сохранённый текст).
   */
  public async render(
    eventType: string,
    payload: Record<string, any> | null | undefined,
  ): Promise<RenderedNotification | null> {
    const titleKey = `notifications.${eventType}.title`;
    const title = await this.orgI18n.translate(titleKey);
    // nestjs-i18n возвращает сам ключ, когда перевода нет.
    if (title === titleKey) return null;

    const ctx = await this.formatContext();
    const args = buildNotificationArgs(eventType, payload, ctx);

    const body = await this.orgI18n.translate(
      `notifications.${eventType}.body`,
      { args },
    );
    const footer = await this.orgI18n.translate('notifications.email_footer');

    return { title, body, footer };
  }
}
