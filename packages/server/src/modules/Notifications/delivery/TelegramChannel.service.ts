// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { DeliveryChannel } from './DeliveryChannel';
import { TelegramApiService } from './TelegramApi.service';
import { Candidate } from '../utils/selectToFire';
import { NotificationsSettingsService } from '../NotificationsSettings.service';
import { NotificationTextsService } from '../NotificationTexts.service';

@Injectable()
export class TelegramChannelService implements DeliveryChannel {
  readonly key = 'telegram';

  constructor(
    private readonly texts: NotificationTextsService,
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

    const rendered = await this.texts.render(
      candidate.eventType,
      candidate.payload,
    );
    if (!rendered) return;

    const text = `${rendered.title}\n\n${rendered.body}\n\n${rendered.footer}`;
    await this.api.sendMessage(botToken, chatId, text);
  }
}
