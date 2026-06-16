// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TelegramApiService } from '../delivery/TelegramApi.service';
import { extractChatId } from '../utils/extractChatId';
import { SETTINGS_GROUP, SETTINGS_KEYS, ERRORS } from '../constants';

@Injectable()
export class ConnectTelegramService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
    private readonly api: TelegramApiService,
    private readonly orgI18n: OrganizationI18nService,
  ) {}

  /** Привязывает бота организации: сохраняет токен, авто-резолвит chat_id, шлёт подтверждение. */
  public async connect(botToken: string): Promise<{ connected: true }> {
    const store = await this.settingsStore();

    // 1. Сохраняем токен.
    store.set({ group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_BOT_TOKEN, value: botToken });
    await store.save();

    // 2. Достаём chat_id из входящих (пользователь должен был написать /start).
    const updates = await this.api.getUpdates(botToken);
    const chatId = extractChatId(updates);
    if (chatId === null) {
      throw new ServiceError(ERRORS.TELEGRAM_NO_CHAT);
    }

    // 3. Сохраняем chat_id.
    store.set({ group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_CHAT_ID, value: String(chatId) });
    await store.save();

    // 4. Подтверждение в чат (на языке организации) — best-effort, не роллбэчим connect.
    try {
      const text = await this.orgI18n.translate('notifications.telegram.connected_message');
      await this.api.sendMessage(botToken, String(chatId), text);
    } catch {
      console.warn('[ConnectTelegram] confirmation sendMessage failed (token hidden)');
    }

    return { connected: true };
  }

  /** Отвязывает бота: очищает токен и chat_id. */
  public async disconnect(): Promise<{ connected: false }> {
    const store = await this.settingsStore();
    store.set({ group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_BOT_TOKEN, value: '' });
    store.set({ group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_CHAT_ID, value: '' });
    await store.save();
    return { connected: false };
  }
}
