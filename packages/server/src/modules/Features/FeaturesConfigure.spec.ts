import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('registers the management articles feature, default off', () => {
    const configure = build().getConfigure();
    const mgmt = configure.find((f) => f.name === Features.MGMT_ARTICLES);

    expect(mgmt).toBeDefined();
    expect(mgmt?.defaultValue).toBe(false);
  });
});
