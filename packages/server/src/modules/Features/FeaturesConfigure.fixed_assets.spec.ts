// © 2026 Bigfin
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — fixed_assets', () => {
  it('флаг fixed_assets присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.FIXED_ASSETS);

    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
