// © 2026 Bigfin
import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure, RU_DEFAULT_FEATURES } from './FeaturesConfigure';
import { FeaturesSettingsDriver } from './FeaturesSettingsDriver';
import { Features } from '@/common/types/Features';

/**
 * К1 карты v19. Из 36 модулей по умолчанию включены два — а российский
 * предприниматель без бухгалтерского образования не пойдёт искать в
 * «Настройки → Модули» печатные формы и анализ НДС: он решит, что их нет.
 * Для организаций с локацией RU набор из коробки шире.
 */
const buildDriver = ({
  location = 'RU',
  stored = {} as Record<string, any>,
}: any = {}) => {
  const featuresConfigure = new FeaturesConfigure({
    get: () => undefined,
  } as unknown as ConfigService);

  const settings = () => ({
    get: ({ key }: any, fallback: any) =>
      key in stored ? stored[key] : fallback,
    set: () => undefined,
    save: async () => undefined,
  });

  const tenancyContext = {
    getTenantMetadata: async () => ({ location }),
  };

  return new FeaturesSettingsDriver(
    { getFeatureConfigure: () => undefined } as any,
    featuresConfigure,
    settings as any,
    tenancyContext as any,
  );
};

describe('набор модулей из коробки', () => {
  it('российская организация сразу видит печатные формы и анализ НДС', async () => {
    const driver = buildDriver({ location: 'RU' });

    await expect(driver.accessible(Features.RU_PRINT_FORMS)).resolves.toBe(true);
    await expect(driver.accessible(Features.VAT_ANALYSIS)).resolves.toBe(true);
    await expect(
      driver.accessible(Features.BANK_STATEMENT_IMPORT),
    ).resolves.toBe(true);
  });

  it('за пределами России набор прежний', async () => {
    const driver = buildDriver({ location: 'US' });

    await expect(driver.accessible(Features.RU_PRINT_FORMS)).resolves.toBe(
      false,
    );
    await expect(driver.accessible(Features.VAT_ANALYSIS)).resolves.toBe(false);
  });

  it('выключенное вручную остаётся выключенным даже в России', async () => {
    // Умолчание — это только умолчание: сохранённый выбор владельца
    // организации сильнее (и хранится строкой «0», отсюда приведение).
    const driver = buildDriver({
      location: 'RU',
      stored: { [Features.RU_PRINT_FORMS]: '0' },
    });

    await expect(driver.accessible(Features.RU_PRINT_FORMS)).resolves.toBe(
      false,
    );
  });

  it('в набор не попадают модули, бесполезные без внешних ключей', async () => {
    // `bank_api_sync` и `marketplaces` без токенов показывают пустой экран —
    // включать их «из коробки» значит обещать то, чего нет.
    expect(RU_DEFAULT_FEATURES).not.toContain(Features.BANK_API_SYNC);
    expect(RU_DEFAULT_FEATURES).not.toContain(Features.MARKETPLACES);
  });

  it('набор задан явным списком, а не собирается случайно', async () => {
    // Список должен читаться глазами: что именно получает новая русская
    // организация — вопрос к одной строке кода, а не к обходу конфигурации.
    expect(RU_DEFAULT_FEATURES.length).toBeGreaterThan(0);
    expect(new Set(RU_DEFAULT_FEATURES).size).toBe(RU_DEFAULT_FEATURES.length);
  });

  it('страница «Модули» показывает то же умолчание, что и проверка доступа', async () => {
    // Иначе переключатель говорит «по умолчанию выключено», а раздел
    // работает — и наоборот.
    const driver = buildDriver({ location: 'RU' });
    const all = await driver.all();
    const printForms = all.find((f) => f.name === Features.RU_PRINT_FORMS);

    expect(printForms?.defaultAccessible).toBe(true);
    expect(printForms?.isAccessible).toBe(true);
  });
});
