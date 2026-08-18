// © 2026 Bigfin
import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

const build = () =>
  new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

describe('FeaturesConfigure — статьи учёта', () => {
  it('включены по умолчанию: на них стоят план-факт и финмодель', () => {
    // Статьи засеваются при создании организации (девять штук), но раздел был
    // спрятан за флагом — и бюджет с финмоделью показывали нули, как будто
    // продукт сломан.
    const flag = build()
      .getConfigure()
      .find((f) => f.name === Features.MGMT_ARTICLES);

    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(true);
  });

  it('остальные модули остаются выключенными', () => {
    // Осознанное решение: включены только статьи учёта (справочник без
    // влияния на учёт) и режим интерфейса (С2 v14, вопрос 16 — иначе ответ
    // мастера настройки игнорировался). Остальное владелец включает сам в
    // «Настройки → Модули».
    const enabled = build()
      .getConfigure()
      .filter((f) => f.defaultValue === true)
      .map((f) => f.name);

    expect(enabled).toEqual([Features.MGMT_ARTICLES, Features.INTERFACE_MODES]);
  });
});
