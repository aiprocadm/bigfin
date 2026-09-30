import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

/**
 * UI-051-4 ТЗ-4: новые списки клиентов и поставщиков включены по умолчанию.
 * Флаги остаются — организация может вернуться к старым спискам.
 */
describe('FeaturesConfigure — новые списки контрагентов', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it.each([Features.CUSTOMERS_LIST_V2, Features.VENDORS_LIST_V2])(
    '%s включён по умолчанию',
    (name) => {
      const flag = build()
        .getConfigure()
        .find((f) => f.name === name);
      expect(flag?.defaultValue).toBe(true);
    },
  );
});
