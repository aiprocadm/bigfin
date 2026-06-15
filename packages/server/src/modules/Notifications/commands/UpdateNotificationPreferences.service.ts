// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { ServiceError } from '@/modules/Items/ServiceError';
import { NotificationPreference } from '../models/NotificationPreference.model';
import { UpdateNotificationPreferencesDto } from '../dtos/NotificationPreferences.dto';
import { NOTIFICATION_EVENTS, SETTINGS_GROUP, ERRORS } from '../constants';

@Injectable()
export class UpdateNotificationPreferencesService {
  constructor(
    @Inject(NotificationPreference.name)
    private readonly prefModel: TenantModelProxy<typeof NotificationPreference>,
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  public async updatePreferences(dto: UpdateNotificationPreferencesDto) {
    // Validate all event types upfront.
    for (const item of dto.preferences) {
      if (!(NOTIFICATION_EVENTS as readonly string[]).includes(item.eventType)) {
        throw new ServiceError(ERRORS.INVALID_EVENT_TYPE);
      }
    }

    // Upsert each preference row.
    for (const item of dto.preferences) {
      const existing = await this.prefModel()
        .query()
        .where('eventType', item.eventType)
        .first();

      const data: any = {
        enabled: item.enabled,
        channels: JSON.stringify(item.channels ?? ['email']),
        threshold: item.threshold ? JSON.stringify(item.threshold) : null,
      };

      if (existing) {
        await this.prefModel().query().findById(existing.id).patch(data);
      } else {
        await this.prefModel()
          .query()
          .insert({ ...data, eventType: item.eventType });
      }
    }

    // Persist recipient_email and cooldown_hours to the settings store.
    const store = await this.settingsStore();

    if (dto.recipientEmail !== undefined) {
      store.set({
        group: SETTINGS_GROUP,
        key: 'recipient_email',
        value: dto.recipientEmail,
      });
    }
    if (dto.cooldownHours !== undefined) {
      store.set({
        group: SETTINGS_GROUP,
        key: 'cooldown_hours',
        value: String(dto.cooldownHours),
      });
    }

    if (dto.recipientEmail !== undefined || dto.cooldownHours !== undefined) {
      await store.save();
    }
  }
}
