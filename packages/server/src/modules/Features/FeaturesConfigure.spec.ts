import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('статьи учёта зарегистрированы и включены по умолчанию', () => {
    // Решение изменено осознанно: раздел спрятан за флагом, а на нём стоят
    // план-факт бюджета и финмодель — они показывали нули и выглядели
    // сломанными. Подробности в FeaturesConfigure.mgmtArticles.spec.ts.
    const configure = build().getConfigure();
    const mgmt = configure.find((f) => f.name === Features.MGMT_ARTICLES);

    expect(mgmt).toBeDefined();
    expect(mgmt?.defaultValue).toBe(true);
  });
});
