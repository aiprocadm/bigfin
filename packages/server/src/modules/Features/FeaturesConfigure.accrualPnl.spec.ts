// © 2026 Bigfin
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';

describe('FeaturesConfigure — accrual P&L', () => {
  it('флаг accrual_pnl присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.ACCRUAL_PNL);

    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
