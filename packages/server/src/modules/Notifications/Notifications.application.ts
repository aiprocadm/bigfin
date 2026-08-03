// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetNotificationPreferencesService } from './queries/GetNotificationPreferences.service';
import { UpdateNotificationPreferencesService } from './commands/UpdateNotificationPreferences.service';
import { PullTelegramEntriesService } from './commands/PullTelegramEntries.service';
import { ConnectTelegramService } from './commands/ConnectTelegram.service';
import { InAppNotificationsService } from './queries/InAppNotifications.service';
import { UpdateNotificationPreferencesDto } from './dtos/NotificationPreferences.dto';

@Injectable()
export class NotificationsApplication {
  constructor(
    private readonly getPreferencesService: GetNotificationPreferencesService,
    private readonly updatePreferencesService: UpdateNotificationPreferencesService,
    private readonly connectTelegramService: ConnectTelegramService,
    private readonly inAppService: InAppNotificationsService,
    private readonly pullTelegramEntriesService: PullTelegramEntriesService,
  ) {}

  getPreferences() {
    return this.getPreferencesService.getPreferences();
  }

  updatePreferences(dto: UpdateNotificationPreferencesDto) {
    return this.updatePreferencesService.updatePreferences(dto);
  }

  connectTelegram(botToken: string) {
    return this.connectTelegramService.connect(botToken);
  }

  disconnectTelegram() {
    return this.connectTelegramService.disconnect();
  }

  /** ㉓ Забрать новые сообщения бота и записать операции. */
  pullTelegramEntries() {
    return this.pullTelegramEntriesService.pull();
  }

  /** ㉓ Счёт, на который попадают операции из Telegram. */
  setTelegramEntryAccount(accountId: number | null) {
    return this.pullTelegramEntriesService.setEntryAccount(accountId);
  }

  getTelegramEntryAccount() {
    return this.pullTelegramEntriesService.getEntryAccount();
  }

  listNotifications() {
    return this.inAppService.list();
  }

  unreadCount() {
    return this.inAppService.unreadCount();
  }

  markNotificationRead(id: number) {
    return this.inAppService.markRead(id);
  }

  markAllNotificationsRead() {
    return this.inAppService.markAllRead();
  }
}
