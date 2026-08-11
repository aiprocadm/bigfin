import { FeaturesConfigureManager } from './FeaturesConfigureManager';
import { Inject, Injectable } from '@nestjs/common';
import { SETTINGS_PROVIDER } from '../Settings/Settings.types';
import { SettingsStore } from '../Settings/SettingsStore';
import { IFeatureAllItem } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';
import { toBoolean } from '@/common/utils/toBoolean';

@Injectable()
export class FeaturesSettingsDriver {
  constructor(
    private readonly configure: FeaturesConfigureManager,
    private readonly featuresConfigure: FeaturesConfigure,

    @Inject(SETTINGS_PROVIDER)
    private readonly settings: () => SettingsStore,
  ) {}

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

    const defaultValue = this.configure.getFeatureConfigure(
      feature,
      'defaultValue',
    );
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
        const { name, defaultValue } = featureConfigure;
        const isAccessible = await this.accessible(featureConfigure.name);
        return { name, isAccessible, defaultAccessible: defaultValue };
      });
    return Promise.all(mappedOpers);
  }
}
