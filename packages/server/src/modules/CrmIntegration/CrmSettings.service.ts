import { Inject, Injectable } from '@nestjs/common';
import { CRM_SETTINGS_GROUP, CRM_SETTINGS_KEYS } from './constants';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';

/**
 * Per-tenant настройки CRM-интеграции: активный коннектор и учётные данные
 * (для Битрикс24 — входящий webhook-URL, содержащий токен; OAuth — вне MVP).
 */
@Injectable()
export class CrmSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  /** Активный коннектор организации (или null). */
  public async getActiveConnector(): Promise<string | null> {
    const store = await this.settingsStore();
    return (
      (store.get(
        { group: CRM_SETTINGS_GROUP, key: CRM_SETTINGS_KEYS.ACTIVE_CONNECTOR },
        null,
      ) as string | null) || null
    );
  }

  /** Входящий webhook-URL Битрикс24 (или null). */
  public async getBitrix24WebhookUrl(): Promise<string | null> {
    const store = await this.settingsStore();
    return (
      (store.get(
        {
          group: CRM_SETTINGS_GROUP,
          key: CRM_SETTINGS_KEYS.BITRIX24_WEBHOOK_URL,
        },
        null,
      ) as string | null) || null
    );
  }

  /** Сохраняет webhook-URL Битрикс24 и делает его активным коннектором. */
  public async setBitrix24WebhookUrl(url: string): Promise<void> {
    const store = await this.settingsStore();
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.BITRIX24_WEBHOOK_URL,
      value: url,
    });
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.ACTIVE_CONNECTOR,
      value: 'bitrix24',
    });
    await store.save();
  }

  /** Сбрасывает учётные данные Битрикс24 и активный коннектор. */
  public async clearBitrix24(): Promise<void> {
    const store = await this.settingsStore();
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.BITRIX24_WEBHOOK_URL,
      value: '',
    });
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.ACTIVE_CONNECTOR,
      value: '',
    });
    await store.save();
  }

  /** Учётные данные amoCRM (поддомен + access-токен) или null. */
  public async getAmocrm(): Promise<{
    subdomain: string | null;
    accessToken: string | null;
  }> {
    const store = await this.settingsStore();
    const subdomain =
      (store.get(
        { group: CRM_SETTINGS_GROUP, key: CRM_SETTINGS_KEYS.AMOCRM_SUBDOMAIN },
        null,
      ) as string | null) || null;
    const accessToken =
      (store.get(
        {
          group: CRM_SETTINGS_GROUP,
          key: CRM_SETTINGS_KEYS.AMOCRM_ACCESS_TOKEN,
        },
        null,
      ) as string | null) || null;
    return { subdomain, accessToken };
  }

  /** Сохраняет учётные данные amoCRM и делает его активным коннектором. */
  public async setAmocrm(subdomain: string, accessToken: string): Promise<void> {
    const store = await this.settingsStore();
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.AMOCRM_SUBDOMAIN,
      value: subdomain,
    });
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.AMOCRM_ACCESS_TOKEN,
      value: accessToken,
    });
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.ACTIVE_CONNECTOR,
      value: 'amocrm',
    });
    await store.save();
  }

  /** Сбрасывает учётные данные amoCRM и активный коннектор. */
  public async clearAmocrm(): Promise<void> {
    const store = await this.settingsStore();
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.AMOCRM_SUBDOMAIN,
      value: '',
    });
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.AMOCRM_ACCESS_TOKEN,
      value: '',
    });
    store.set({
      group: CRM_SETTINGS_GROUP,
      key: CRM_SETTINGS_KEYS.ACTIVE_CONNECTOR,
      value: '',
    });
    await store.save();
  }
}
