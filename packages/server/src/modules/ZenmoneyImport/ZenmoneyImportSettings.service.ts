import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';

const GROUP = 'zenmoney';
const TOKEN_KEY = 'access_token';
/** Метка последней выгрузки: с неё продолжаем, а не тянем историю заново. */
const TIMESTAMP_KEY = 'server_timestamp';

/** Per-tenant настройки Дзенмани: токен и метка выгрузки (⑨b). */
@Injectable()
export class ZenmoneyImportSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  public async getToken(): Promise<string | null> {
    const store = await this.settingsStore();
    return (
      (store.get({ group: GROUP, key: TOKEN_KEY }, null) as string | null) ||
      null
    );
  }

  public async setToken(token: string): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: TOKEN_KEY, value: token });
    await store.save();
  }

  /** Метка прошлой выгрузки; 0 — импорта ещё не было. */
  public async getServerTimestamp(): Promise<number> {
    const store = await this.settingsStore();
    return Number(store.get({ group: GROUP, key: TIMESTAMP_KEY }, 0)) || 0;
  }

  public async setServerTimestamp(timestamp: number): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: TIMESTAMP_KEY, value: String(timestamp) });
    await store.save();
  }

  public async clearToken(): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: TOKEN_KEY, value: '' });
    // Отключились — забываем и метку: следующее подключение может быть
    // к другому аккаунту, и продолжать с чужой метки нельзя.
    store.set({ group: GROUP, key: TIMESTAMP_KEY, value: '0' });
    await store.save();
  }
}
