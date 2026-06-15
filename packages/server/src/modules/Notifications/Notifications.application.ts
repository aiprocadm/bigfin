// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetNotificationPreferencesService } from './queries/GetNotificationPreferences.service';
import { UpdateNotificationPreferencesService } from './commands/UpdateNotificationPreferences.service';
import { UpdateNotificationPreferencesDto } from './dtos/NotificationPreferences.dto';

@Injectable()
export class NotificationsApplication {
  constructor(
    private readonly getPreferencesService: GetNotificationPreferencesService,
    private readonly updatePreferencesService: UpdateNotificationPreferencesService,
  ) {}

  getPreferences() {
    return this.getPreferencesService.getPreferences();
  }

  updatePreferences(dto: UpdateNotificationPreferencesDto) {
    return this.updatePreferencesService.updatePreferences(dto);
  }
}
