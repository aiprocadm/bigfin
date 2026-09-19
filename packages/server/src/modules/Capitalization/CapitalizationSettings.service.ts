// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { SettingsStore } from '../Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '../Settings/Settings.types';

/** Настройки оценки стоимости (остаток С2 этапа 11). */
export interface CapitalizationSettings {
  /**
   * Множитель прибыли для оценки бизнеса.
   *
   * Значения по умолчанию НЕТ намеренно: множитель зависит от отрасли, и
   * подставленное «обычно 4» выглядело бы как совет продукта. Пока владелец
   * не задал своё число, оценка по мультипликатору просто не показывается —
   * это честнее выдуманной цифры.
   */
  profitMultiple: number | null;
}

@Injectable()
export class CapitalizationSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  public async getSettings(): Promise<CapitalizationSettings> {
    const settingsStore = await this.settingsStore();
    const raw = settingsStore.get(
      { group: 'capitalization', key: 'profit_multiple' },
      null,
    );

    return { profitMultiple: this.toMultiple(raw) };
  }

  public async setProfitMultiple(value: number | null): Promise<void> {
    const settingsStore = await this.settingsStore();

    settingsStore.set({
      group: 'capitalization',
      key: 'profit_multiple',
      value: this.toMultiple(value),
    });
    await settingsStore.save();
  }

  /**
   * Множитель числом либо `null`.
   *
   * Ноль, минус и мусор — это НЕ множитель. Превратить их в число значило бы
   * показать «стоимость 0 ₽» там, где настройки просто нет: ноль читается
   * как расчёт, а пустота — как «не настроено».
   */
  private toMultiple(value: unknown): number | null {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    return parsed;
  }
}
