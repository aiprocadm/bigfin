import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';

const GROUP = 'marketplaces';
const WB_KEY = 'wildberries_api_key';
// Ozon требует пару: идентификатор кабинета и ключ.
const OZON_CLIENT_ID = 'ozon_client_id';
const OZON_API_KEY = 'ozon_api_key';

export interface OzonCredentials {
  clientId: string;
  apiKey: string;
}

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

  /** Учётные данные Ozon (или null, если заполнены не полностью). */
  public async getOzonCredentials(): Promise<OzonCredentials | null> {
    const store = await this.settingsStore();
    const clientId = (store.get({ group: GROUP, key: OZON_CLIENT_ID }, '') ||
      '') as string;
    const apiKey = (store.get({ group: GROUP, key: OZON_API_KEY }, '') ||
      '') as string;

    return clientId && apiKey ? { clientId, apiKey } : null;
  }

  /** Сохраняет учётные данные Ozon. */
  public async setOzonCredentials(
    clientId: string,
    apiKey: string,
  ): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: OZON_CLIENT_ID, value: clientId });
    store.set({ group: GROUP, key: OZON_API_KEY, value: apiKey });
    await store.save();
  }

  /** Сбрасывает учётные данные Ozon. */
  public async clearOzonCredentials(): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: OZON_CLIENT_ID, value: '' });
    store.set({ group: GROUP, key: OZON_API_KEY, value: '' });
    await store.save();
  }
}
