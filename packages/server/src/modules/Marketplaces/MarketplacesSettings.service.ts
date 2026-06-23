import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';

const GROUP = 'marketplaces';
const WB_KEY = 'wildberries_api_key';

/** Per-tenant настройки маркетплейсов: API-ключи WB/Ozon (⑱). */
@Injectable()
export class MarketplacesSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  /** API-ключ Wildberries (или null). */
  public async getWbKey(): Promise<string | null> {
    const store = await this.settingsStore();
    return (
      (store.get({ group: GROUP, key: WB_KEY }, null) as string | null) || null
    );
  }

  /** Сохраняет API-ключ Wildberries. */
  public async setWbKey(key: string): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: WB_KEY, value: key });
    await store.save();
  }

  /** Сбрасывает API-ключ Wildberries. */
  public async clearWbKey(): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: WB_KEY, value: '' });
    await store.save();
  }
}
