// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { DeliveryChannel } from './DeliveryChannel';
import { TelegramApiService } from './TelegramApi.service';
import { Candidate } from '../utils/selectToFire';
import { NotificationsSettingsService } from '../NotificationsSettings.service';

@Injectable()
export class TelegramChannelService implements DeliveryChannel {
  readonly key = 'telegram';

  constructor(
    private readonly orgI18n: OrganizationI18nService,
    private readonly api: TelegramApiService,
    private readonly settings: NotificationsSettingsService,
  ) {}

  public async isConfigured(): Promise<boolean> {
    const { botToken, chatId } = await this.settings.getTelegram();
    return Boolean(botToken && chatId);
  }

  public async deliver(candidate: Candidate): Promise<void> {
    const { botToken, chatId } = await this.settings.getTelegram();
    if (!botToken || !chatId) return;

    const args = candidate.payload ?? {};
    const title = await this.orgI18n.translate(
      `notifications.${candidate.eventType}.title`,
    );
    const body = await this.orgI18n.translate(
      `notifications.${candidate.eventType}.body`,
      { args },
    );
    const footer = await this.orgI18n.translate('notifications.email_footer');

    const text = `${title}\n\n${body}\n\n${footer}`;
    await this.api.sendMessage(botToken, chatId, text);
  }
}
