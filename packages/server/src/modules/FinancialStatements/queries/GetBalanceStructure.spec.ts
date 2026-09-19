// © 2026 Bigfin
import { GetBalanceStructureService } from './GetBalanceStructure.service';

/**
 * Структура баланса для картинки (этап 4 ТЗ, остаток О2).
 *
 * Главное здесь — не красота, а согласие с таблицей под картинкой. Картинка,
 * которая спорит с числами, хуже отсутствующей: человек перестаёт верить
 * обеим.
 */
const buildService = (nodes: any[]) => {
  const balanceSheet = {
    sheet: async () => ({ data: nodes }),
  };

  return new GetBalanceStructureService(balanceSheet as any);
};

const node = (id: string, name: string, amount: number, children?: any[]) => ({
  id,
  name,
  total: { amount },
  children,
});

const demoBalance = () => [
  node('ASSETS', 'Активы', 1_000_000, [
    node('CURRENT_ASSETS', 'Оборотные активы', 600_000),
    node('FIXED_ASSET', 'Основные средства', 400_000),
    node('NON_CURRENT_ASSET', 'Внеоборотные активы', 0),
  ]),
  node('LIABILITY_EQUITY', 'Обязательства и капитал', 1_000_000, [
    node('LIABILITY', 'Обязательства', 250_000),
    node('EQUITY', 'Капитал', 750_000),
  ]),
];

describe('структура баланса', () => {
  it('обе половины разложены по группам второго уровня', async () => {
    // Второй уровень — те слова, которыми предприниматель думает о деньгах.
    // Сорок счетов на картинке не сообщают ничего.
    const result = await buildService(demoBalance()).getStructure(
      '2026-01-01',
      '2026-12-31',
    );

    expect(result.assets.map((slice) => slice.id)).toEqual([
      'CURRENT_ASSETS',
      'FIXED_ASSET',
    ]);
    expect(result.liabilitiesEquity.map((slice) => slice.id)).toEqual([
      'LIABILITY',
      'EQUITY',
    ]);
  });

  it('доли внутри половины складываются в единицу', async () => {
    const result = await buildService(demoBalance()).getStructure(
      '2026-01-01',
      '2026-12-31',
    );

    const sum = result.assets.reduce((total, slice) => total + slice.share, 0);

    expect(sum).toBeCloseTo(1, 10);
    expect(result.assets[0].share).toBeCloseTo(0.6, 10);
  });

  it('пустая группа не попадает на картинку', async () => {
    // Ноль — это не «ноль процентов», это отсутствие строки.
    const result = await buildService(demoBalance()).getStructure(
      '2026-01-01',
      '2026-12-31',
    );

    expect(
      result.assets.some((slice) => slice.id === 'NON_CURRENT_ASSET'),
    ).toBe(false);
  });

  it('итог половины берётся из отчёта, а не складывается из долей', async () => {
    // Иначе картинка и таблица разошлись бы на любой группе, которую
    // картинка не рисует.
    const result = await buildService(demoBalance()).getStructure(
      '2026-01-01',
      '2026-12-31',
    );

    expect(result.assetsTotal).toBe(1_000_000);
    expect(result.liabilitiesEquityTotal).toBe(1_000_000);
  });

  describe('отрицательная группа', () => {
    const withNegative = () => [
      node('ASSETS', 'Активы', 570_000, [
        node('CURRENT_ASSETS', 'Оборотные активы', 600_000),
        // Накопленная амортизация больше стоимости — так бывает по-настоящему.
        node('FIXED_ASSET', 'Основные средства', -30_000),
      ]),
      node('LIABILITY_EQUITY', 'Обязательства и капитал', 570_000, [
        node('EQUITY', 'Капитал', 570_000),
      ]),
    ];

    it('не рисуется: ширины у минуса не существует', async () => {
      const result = await buildService(withNegative()).getStructure(
        '2026-01-01',
        '2026-12-31',
      );
      const fixed = result.assets.find((slice) => slice.id === 'FIXED_ASSET');

      expect(fixed?.share).toBe(0);
    });

    it('но и не прячется: сумма осталась при ней', async () => {
      // Молча выбросить её — худшее: итог картинки разошёлся бы с таблицей.
      const result = await buildService(withNegative()).getStructure(
        '2026-01-01',
        '2026-12-31',
      );
      const fixed = result.assets.find((slice) => slice.id === 'FIXED_ASSET');

      expect(fixed?.total).toBe(-30_000);
    });

    it('ширины остальных считаются без неё', async () => {
      // Если делить на итог половины (570 000), полоса вышла бы длиннее
      // самой себя: 600 000 из 570 000 — это 105%.
      const result = await buildService(withNegative()).getStructure(
        '2026-01-01',
        '2026-12-31',
      );
      const current = result.assets.find(
        (slice) => slice.id === 'CURRENT_ASSETS',
      );

      expect(current?.share).toBeCloseTo(1, 10);
    });
  });

  it('пустой баланс не роняет картинку', async () => {
    const result = await buildService([]).getStructure(
      '2026-01-01',
      '2026-12-31',
    );

    expect(result.assets).toEqual([]);
    expect(result.assetsTotal).toBe(0);
  });
});
