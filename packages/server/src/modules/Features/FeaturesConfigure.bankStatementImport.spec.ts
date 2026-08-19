// © 2026 Bigfin
import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { MODULE_ALLOWLIST } from './Features.constants';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — загрузка банковской выписки', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('флаг зарегистрирован и по умолчанию выключен', () => {
    const flag = build()
      .getConfigure()
      .find((f) => f.name === Features.BANK_STATEMENT_IMPORT);

    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });

  it('модуль переключаемый пользователем', () => {
    // Импорт выписки 1С и таблиц написан целиком, но флага не было в
    // allowlist: в приёмках его включали прямым SQL (М2 карты v15).
    expect(MODULE_ALLOWLIST).toContain(Features.BANK_STATEMENT_IMPORT);
  });
});
