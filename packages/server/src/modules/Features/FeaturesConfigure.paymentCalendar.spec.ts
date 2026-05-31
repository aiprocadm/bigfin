import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — payment calendar', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('registers the payment calendar feature, default off', () => {
    const configure = build().getConfigure();
    const flag = configure.find((f) => f.name === Features.PAYMENT_CALENDAR);

    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });
});
