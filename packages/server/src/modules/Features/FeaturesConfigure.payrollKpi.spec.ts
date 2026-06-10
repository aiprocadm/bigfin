// © 2026 Bigfin
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';

describe('FeaturesConfigure — payroll KPI', () => {
  it('флаг payroll_kpi присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.PAYROLL_KPI);

    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
