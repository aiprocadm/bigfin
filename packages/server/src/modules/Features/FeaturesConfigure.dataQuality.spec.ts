// © 2026 Bigfin
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';

describe('FeaturesConfigure — data quality', () => {
  it('флаг data_quality присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.DATA_QUALITY);

    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
