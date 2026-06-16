// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetNotificationPreferencesService } from './queries/GetNotificationPreferences.service';
import { UpdateNotificationPreferencesService } from './commands/UpdateNotificationPreferences.service';
import { ConnectTelegramService } from './commands/ConnectTelegram.service';
import { UpdateNotificationPreferencesDto } from './dtos/NotificationPreferences.dto';

@Injectable()
export class NotificationsApplication {
  constructor(
    private readonly getPreferencesService: GetNotificationPreferencesService,
    private readonly updatePreferencesService: UpdateNotificationPreferencesService,
    private readonly connectTelegramService: ConnectTelegramService,
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
}
