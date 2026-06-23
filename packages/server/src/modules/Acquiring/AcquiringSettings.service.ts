import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';

const GROUP = 'acquiring';
const SHOP_ID = 'yookassa_shop_id';
const SECRET = 'yookassa_secret_key';

/** Per-tenant настройки эквайринга: креды YooKassa (⑨d). */
@Injectable()
export class AcquiringSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  public async getYookassa(): Promise<{
    shopId: string | null;
    secretKey: string | null;
  }> {
    const store = await this.settingsStore();
    const shopId =
      (store.get({ group: GROUP, key: SHOP_ID }, null) as string | null) || null;
    const secretKey =
      (store.get({ group: GROUP, key: SECRET }, null) as string | null) || null;
    return { shopId, secretKey };
  }

  public async setYookassa(shopId: string, secretKey: string): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: SHOP_ID, value: shopId });
    store.set({ group: GROUP, key: SECRET, value: secretKey });
    await store.save();
  }

  public async clearYookassa(): Promise<void> {
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: SHOP_ID, value: '' });
    store.set({ group: GROUP, key: SECRET, value: '' });
    await store.save();
  }
}
