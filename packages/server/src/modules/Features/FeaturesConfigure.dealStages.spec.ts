// © 2026 Bigfin
import { ConfigService } from '@nestjs/config';
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';

describe('FeaturesConfigure — deal stages', () => {
  it('registers the deal_stages feature, off by default', () => {
    const cfg = new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);
    const flag = cfg.getConfigure().find((f) => f.name === Features.DEAL_STAGES);
    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });
});
