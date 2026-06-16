// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { NotificationPreference } from '../models/NotificationPreference.model';
import { NotificationsSettingsService } from '../NotificationsSettings.service';
import { NOTIFICATION_EVENTS } from '../constants';

const DEFAULT_THRESHOLDS: Record<string, any> = {
  cash_gap: { horizonDays: 7 },
  low_balance: { minAmount: 0 },
  overdue: {},
};

@Injectable()
export class GetNotificationPreferencesService {
  constructor(
    @Inject(NotificationPreference.name)
    private readonly prefModel: TenantModelProxy<typeof NotificationPreference>,
    private readonly settings: NotificationsSettingsService,
  ) {}

  public async getPreferences() {
    const rows: NotificationPreference[] = await this.prefModel().query();
    const byType = new Map(rows.map((r) => [r.eventType, r]));

    const preferences = NOTIFICATION_EVENTS.map((eventType) => {
      const row = byType.get(eventType);
      return {
        eventType,
        enabled: row ? Boolean(row.enabled) : false,
        channels: row
          ? (() => {
              try {
                return JSON.parse(row.channels);
              } catch {
                return ['email'];
              }
            })()
          : ['email'],
        threshold: row?.threshold
          ? (() => {
              try {
                return JSON.parse(row.threshold);
              } catch {
                return DEFAULT_THRESHOLDS[eventType] ?? {};
              }
            })()
          : DEFAULT_THRESHOLDS[eventType] ?? {},
      };
    });

    const { cooldownHours, recipientEmail } = await this.settings.get();

    return { preferences, recipientEmail, cooldownHours };
  }
}
