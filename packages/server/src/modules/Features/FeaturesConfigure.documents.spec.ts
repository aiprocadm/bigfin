import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

/**
 * Этап 1 ТЗ, п. 1.4. Блок первичных документов уходит под выключатель.
 *
 * Счета, акты, накладные и расходы — рабочая часть продукта, но нужна она
 * тем, кто выставляет первичку из Bigfin, а не тем, кто ведёт управленческий
 * учёт. По умолчанию блок выключен (решение владельца от 18.09.2026, строго
 * по ТЗ), включается в «Настройки → Модули».
 *
 * Проверка держит именно значение по умолчанию: если однажды флаг заведут
 * включённым, меню снова распухнет на девять пунктов молча.
 */
describe('FeaturesConfigure — documents', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('флаг документов зарегистрирован и выключен по умолчанию', () => {
    const flag = build()
      .getConfigure()
      .find((feature) => feature.name === Features.DOCUMENTS);

    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });
});
