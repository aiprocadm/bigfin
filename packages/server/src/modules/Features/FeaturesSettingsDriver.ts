import { FeaturesConfigureManager } from './FeaturesConfigureManager';
import { Inject, Injectable } from '@nestjs/common';
import { SETTINGS_PROVIDER } from '../Settings/Settings.types';
import { SettingsStore } from '../Settings/SettingsStore';
import { IFeatureAllItem } from '@/common/types/Features';
import {
  FeaturesConfigure,
  RU_DEFAULT_FEATURES,
  RU_LOCATION,
} from './FeaturesConfigure';
import { toBoolean } from '@/common/utils/toBoolean';
import { TenancyContext } from '../Tenancy/TenancyContext.service';

@Injectable()
export class FeaturesSettingsDriver {
  constructor(
    private readonly configure: FeaturesConfigureManager,
    private readonly featuresConfigure: FeaturesConfigure,

    @Inject(SETTINGS_PROVIDER)
    private readonly settings: () => SettingsStore,

    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Умолчание модуля с поправкой на страну организации (К1 карты v19).
   *
   * Российская организация получает из коробки то, ради чего продукт и
   * берут: печатные формы, анализ НДС, импорт выписки, обмен с 1С,
   * платёжный календарь, долги. Умолчание остаётся умолчанием — сохранённый
   * выбор владельца организации сильнее и проверяется отдельно.
   *
   * @param {string} feature - Имя модуля.
   * @returns {Promise<boolean>}
   */
  private async defaultValueFor(feature: string): Promise<boolean> {
    const baseValue = this.configure.getFeatureConfigure(
      feature,
      'defaultValue',
    );
    if (!RU_DEFAULT_FEATURES.includes(feature)) {
      return toBoolean(baseValue);
    }
    // Локация неизвестна (например, организация ещё строится) — ведём себя
    // как раньше: лишний включённый модуль хуже отсутствующего.
    const metadata = await this.tenancyContext.getTenantMetadata().catch(() => null);

    return metadata?.location === RU_LOCATION ? true : toBoolean(baseValue);
  }

  /**
   * Turns-on the given feature name.
   * @param {string} feature - The feature name.
   * @returns {Promise<void>}
   */
  async turnOn(feature: string) {
    const settingsStore = await this.settings();

    settingsStore.set({ group: 'features', key: feature, value: true });
    await settingsStore.save();
  }

  /**
   * Turns-off the given feature name.
   * @param {string} feature - The feature name.
   * @returns {Promise<void>}
   */
  async turnOff(feature: string) {
    const settingsStore = await this.settings();

    settingsStore.set({ group: 'features', key: feature, value: false });
    await settingsStore.save();
  }

  /**
   * Determines the given feature name is accessible.
   *
   * Значение обязательно приводится к настоящему «да/нет».
   *
   * Почему это важно. Настройки хранятся в базе строками, и модуль, который
   * когда-то включали, а потом выключили, возвращался как строка «0». В
   * JavaScript непустая строка — это ИСТИНА, поэтому любая проверка вида
   * `if (!accessible)` пропускала запрос: выключенный модуль продолжал
   * отвечать. Ловится это только на модуле, который переключали руками, —
   * ни разу не тронутый отдаёт настоящее `false` из умолчаний.
   *
   * @param {string} feature - The feature name.
   * @returns {Promise<boolean>}
   */
  async accessible(feature: string): Promise<boolean> {
    const settingsStore = await this.settings();

    const defaultValue = await this.defaultValueFor(feature);
    const stored = settingsStore.get(
      { group: 'features', key: feature },
      defaultValue,
    );
    return toBoolean(stored);
  }

  /**
   * Retrieves the all features and their accessible value and default value.
   * @returns {Promise<IFeatureAllItem>}
   */
  async all(): Promise<IFeatureAllItem[]> {
    const mappedOpers = this.featuresConfigure
      .getConfigure()
      .map(async (featureConfigure) => {
        const { name } = featureConfigure;
        // Умолчание показываем то же самое, что действует на самом деле:
        // иначе переключатель говорит «выключено», а раздел работает.
        const defaultAccessible = await this.defaultValueFor(name);
        const isAccessible = await this.accessible(name);

        return { name, isAccessible, defaultAccessible };
      });
    return Promise.all(mappedOpers);
  }
}
