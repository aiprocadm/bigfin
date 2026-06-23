import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';

const GROUP = 'moysklad';
const TOKEN_KEY = 'access_token';

/** Per-tenant настройки МойСклад: токен доступа (㉛). */
@Injectable()
export class MoyskladSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  /** Токен МойСклад текущей организации (или null). */
  public async getToken(): Promise<string | null> {
    const store = await this.settingsStore();
    return (
      (store.get({ group: GROUP, key: TOKEN_KEY }, null) as string | null) ||
      null
    );
  }

  /** Сохраняет токен МойСклад. */
  public async setToken(token: string): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: TOKEN_KEY, value: token });
    await store.save();
  }

  /** Сбрасывает токен МойСклад. */
  public async clearToken(): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: TOKEN_KEY, value: '' });
    await store.save();
  }
}
