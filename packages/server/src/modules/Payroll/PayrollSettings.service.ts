// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { PAYROLL_SETTINGS_DEFAULTS, PayrollSettingsValues } from './constants';

const GROUP = 'payroll';

@Injectable()
export class PayrollSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  /**
   * Ставки и параметры ФОТ из Settings group `payroll`;
   * отсутствующие ключи закрываются дефолтами (см. спеку §6).
   */
  public async getSettings(): Promise<PayrollSettingsValues> {
    const store = await this.settingsStore();
    const D = PAYROLL_SETTINGS_DEFAULTS;

    const num = (key: string, fallback: number): number => {
      const raw = store.get({ group: GROUP, key }, fallback);
      const n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    };
    const numOrNull = (key: string): number | null => {
      const raw = store.get({ group: GROUP, key }, null);
      const n = Number(raw);
      return raw != null && Number.isFinite(n) && n > 0 ? n : null;
    };

    return {
      ndflRate: num('ndfl_rate', D.ndflRate),
      contribMode:
        store.get({ group: GROUP, key: 'contrib_mode' }, D.contribMode) ===
        'msp'
          ? 'msp'
          : 'standard',
      contribRate: num('contrib_rate', D.contribRate),
      mspRate: num('msp_rate', D.mspRate),
      mspThreshold: num('msp_threshold', D.mspThreshold),
      payrollArticleId: numOrNull('payroll_article_id'),
      taxesArticleId: numOrNull('taxes_article_id'),
    };
  }
}
