// © 2026 Bigfin
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';
import { MODULE_ALLOWLIST } from './Features.constants';

describe('FeaturesConfigure — payroll KPI', () => {
  it('модуль переключаемый пользователем', () => {
    // Вкладка KPI, цели и расчёт премий написаны целиком, но флага не было в
    // allowlist — включить их нельзя было ничем (М2 карты v15).
    expect(MODULE_ALLOWLIST).toContain(Features.PAYROLL_KPI);
  });

  it('флаг payroll_kpi присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.PAYROLL_KPI);

    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
