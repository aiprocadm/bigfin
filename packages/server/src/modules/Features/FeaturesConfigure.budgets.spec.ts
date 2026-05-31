import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — budgets', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('registers the budgets feature, default off', () => {
    const flag = build()
      .getConfigure()
      .find((f) => f.name === Features.BUDGETS);
    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });
});
