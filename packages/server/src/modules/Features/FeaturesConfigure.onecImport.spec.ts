import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { MODULE_ALLOWLIST } from './Features.constants';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — импорт из 1С (⑩)', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('флаг зарегистрирован и по умолчанию выключен', () => {
    const flag = build()
      .getConfigure()
      .find((f) => f.name === Features.ONEC_IMPORT);

    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });

  it('модуль переключаемый пользователем', () => {
    // Без записи в allowlist кнопка включения в настройках вернёт 400,
    // а без записи в реестре флаг вообще не доедет до фронта.
    expect(MODULE_ALLOWLIST).toContain(Features.ONEC_IMPORT);
  });
});
