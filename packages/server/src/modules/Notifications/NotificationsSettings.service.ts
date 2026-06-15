// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SETTINGS_GROUP, DEFAULT_COOLDOWN_HOURS } from './constants';

@Injectable()
export class NotificationsSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  public async get() {
    const store = await this.settingsStore();
    const cooldownRaw = store.get(
      { group: SETTINGS_GROUP, key: 'cooldown_hours' },
      DEFAULT_COOLDOWN_HOURS,
    );
    const cooldownHours =
      Number(cooldownRaw) > 0 ? Number(cooldownRaw) : DEFAULT_COOLDOWN_HOURS;
    const recipientEmail = store.get(
      { group: SETTINGS_GROUP, key: 'recipient_email' },
      null,
    ) as string | null;
    return { cooldownHours, recipientEmail };
  }
}
