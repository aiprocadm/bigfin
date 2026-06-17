// © 2026 Bigfin
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — interface_modes', () => {
  it('флаг interface_modes присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.INTERFACE_MODES);
    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
