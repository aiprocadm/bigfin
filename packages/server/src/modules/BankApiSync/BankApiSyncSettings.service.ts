import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import {
  BankCredentials,
  BankProviderId,
  BANK_PROVIDER_IDS,
} from './connectors/BankProvider.types';

const GROUP = 'bank_api_sync';
/** Ключ до мультипровайдерности — читаем для совместимости. */
const LEGACY_TINKOFF_TOKEN = 'tinkoff_token';

const credentialsKey = (provider: BankProviderId) => `${provider}_credentials`;

/** Per-tenant учётные данные банковских API по провайдерам (⑨c). */
@Injectable()
export class BankApiSyncSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  public async getCredentials(
    provider: BankProviderId,
  ): Promise<BankCredentials | null> {
    const store = await this.settingsStore();
    const raw = store.get(
      { group: GROUP, key: credentialsKey(provider) },
      null,
    ) as string | null;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.kind) return parsed as BankCredentials;
      } catch {
        // Битую запись считаем отсутствующей — пользователь переподключит банк.
      }
    }
    if (provider === 'tinkoff') {
      const legacy = store.get(
        { group: GROUP, key: LEGACY_TINKOFF_TOKEN },
        null,
      ) as string | null;
      if (legacy) return { kind: 'token', token: legacy };
    }
    return null;
  }

  public async setCredentials(
    provider: BankProviderId,
    credentials: BankCredentials,
  ): Promise<void> {
    const store = await this.settingsStore();
    store.set({
      group: GROUP,
      key: credentialsKey(provider),
      value: JSON.stringify(credentials),
    });
    await store.save();
  }

  public async clearCredentials(provider: BankProviderId): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: credentialsKey(provider), value: '' });

    if (provider === 'tinkoff') {
      store.set({ group: GROUP, key: LEGACY_TINKOFF_TOKEN, value: '' });
    }
    await store.save();
  }

  /** Карта «банк → подключён ли». */
  public async listConnected(): Promise<Record<BankProviderId, boolean>> {
    const entries = await Promise.all(
      BANK_PROVIDER_IDS.map(
        async (id) => [id, !!(await this.getCredentials(id))] as const,
      ),
    );
    return Object.fromEntries(entries) as Record<BankProviderId, boolean>;
  }
}
