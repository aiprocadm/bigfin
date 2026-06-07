// © 2026 Bigfin
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — cost allocation', () => {
  it('registers the cost_allocation feature, off by default', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.COST_ALLOCATION);

    expect(entry).toBeDefined();
    expect(entry!.defaultValue).toBe(false);
  });
});
