import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';

const GROUP = 'bank_api_sync';
const TINKOFF_TOKEN = 'tinkoff_token';

/** Per-tenant настройки банковских API: токен Тинькофф (⑨c). */
@Injectable()
export class BankApiSyncSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  public async getTinkoffToken(): Promise<string | null> {
    const store = await this.settingsStore();
    return (
      (store.get({ group: GROUP, key: TINKOFF_TOKEN }, null) as string | null) ||
      null
    );
  }

  public async setTinkoffToken(token: string): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: TINKOFF_TOKEN, value: token });
    await store.save();
  }

  public async clearTinkoffToken(): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: TINKOFF_TOKEN, value: '' });
    await store.save();
  }
}
