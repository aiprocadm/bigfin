// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';

import { AiProviderSettings } from './providers/AiProvider';

const GROUP = 'ai_analyst';
const PROVIDER = 'provider';
const API_KEY = 'api_key';
const ENDPOINT = 'endpoint';
const FOLDER_ID = 'folder_id';
const MODEL = 'model';
const FORBID_EXTERNAL = 'forbid_external_data';

/**
 * Настройки ИИ-аналитика на организацию (этап 13 ТЗ, §13.2).
 *
 * ТЗ: «Ключи и адрес endpoint — в настройках организации, не в коде». Ключ в
 * коде означал бы, что все покупатели ходят в модель через наш счёт, а тот,
 * кто ставит продукт на свой сервер, не может подключить свою модель.
 */
@Injectable()
export class AiAnalystSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  public async getProviderSettings(): Promise<AiProviderSettings> {
    const store = await this.settingsStore();
    const read = (key: string) =>
      (store.get({ group: GROUP, key }, null) as string | null) || null;

    return {
      provider: read(PROVIDER),
      apiKey: read(API_KEY),
      endpoint: read(ENDPOINT),
      folderId: read(FOLDER_ID),
      model: read(MODEL),
    };
  }

  /**
   * Запрещено ли отправлять данные во внешние сервисы (§13.1 п. 5).
   *
   * По умолчанию — НЕ запрещено, иначе включённый вручную раздел не работал
   * бы и человек не понял бы почему. Но сам запрет, будучи включённым,
   * сильнее любых настроек провайдера.
   */
  public async isExternalDataForbidden(): Promise<boolean> {
    const store = await this.settingsStore();

    return Boolean(store.get({ group: GROUP, key: FORBID_EXTERNAL }, false));
  }

  public async saveSettings(
    settings: AiProviderSettings & { forbidExternalData?: boolean },
  ): Promise<void> {
    const store = await this.settingsStore();
    const write = (key: string, value: unknown) => {
      if (value === undefined) return;
      store.set({ group: GROUP, key, value: value ?? '' });
    };

    write(PROVIDER, settings.provider);
    write(ENDPOINT, settings.endpoint);
    write(FOLDER_ID, settings.folderId);
    write(MODEL, settings.model);
    if (settings.forbidExternalData !== undefined) {
      write(FORBID_EXTERNAL, settings.forbidExternalData);
    }
    // Ключ перезаписывается только когда прислали новый: иначе открытие
    // формы настроек с пустым полем стирало бы рабочий ключ.
    if (settings.apiKey) {
      write(API_KEY, settings.apiKey);
    }
    await store.save();
  }
}
