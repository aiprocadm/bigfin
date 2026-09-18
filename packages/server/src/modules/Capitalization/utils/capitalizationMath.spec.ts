// © 2026 Bigfin
import {
  buildValueDrivers,
  buildValueSeries,
  computeMultipleValuation,
  computeNetAssets,
  computeOwnerValue,
} from './capitalizationMath';

/**
 * Этап 11 ТЗ. Капитализация и стоимость бизнеса.
 *
 * Оценка бизнеса — место, где легко нарисовать красивое число, которое
 * ничего не значит. Поэтому почти каждая проверка ниже — про то, когда
 * считать НЕЛЬЗЯ.
 */

describe('computeNetAssets', () => {
  it('чем владеем минус кому должны', () => {
    expect(computeNetAssets(5_000_000, 2_000_000)).toBe(3_000_000);
  });

  it('отрицательные чистые активы — это сигнал, а не ошибка', () => {
    // Долгов больше, чем имущества. Прятать такое число нельзя.
    expect(computeNetAssets(1_000_000, 3_000_000)).toBe(-2_000_000);
  });

  it('пустые данные дают ноль, а не поломку', () => {
    expect(computeNetAssets(undefined as any, undefined as any)).toBe(0);
  });
});

describe('computeMultipleValuation', () => {
  it('прибыль, умноженная на множитель', () => {
    expect(computeMultipleValuation(2_000_000, 4)).toEqual({
      value: 8_000_000,
      applicable: true,
    });
  });

  it('убыточный бизнес так НЕ оценивается', () => {
    // −2 млн × 4 = «стоимость −8 млн»: выглядит как расчёт, а смысла нет.
    // Бизнес не стоит отрицательных денег, его просто не оценивают так.
    expect(computeMultipleValuation(-2_000_000, 4).applicable).toBe(false);
  });

  it('нулевая прибыль тоже не оценивается', () => {
    expect(computeMultipleValuation(0, 4).applicable).toBe(false);
  });

  it('ненастроенный множитель не даёт оценки', () => {
    // Ноль или минус означают, что множитель забыли настроить,
    // а не что бизнес ничего не стоит.
    expect(computeMultipleValuation(2_000_000, 0).applicable).toBe(false);
    expect(computeMultipleValuation(2_000_000, -3).applicable).toBe(false);
  });
});

describe('computeOwnerValue', () => {
  it('доля владельца считается от стоимости', () => {
    expect(computeOwnerValue(8_000_000, 51)).toEqual({
      value: 4_080_000,
      applicable: true,
    });
  });

  it('доля вне диапазона — ошибка данных, а не странное число', () => {
    expect(computeOwnerValue(8_000_000, 120).applicable).toBe(false);
    expect(computeOwnerValue(8_000_000, -1).applicable).toBe(false);
  });

  it('полная доля даёт всю стоимость', () => {
    expect(computeOwnerValue(8_000_000, 100).value).toBe(8_000_000);
  });
});

describe('buildValueDrivers', () => {
  it('долг уменьшает стоимость, даже будучи положительным числом', () => {
    // Направление определяется смыслом статьи, а не знаком: иначе
    // разложение покажет долги как рост стоимости.
    const drivers = buildValueDrivers({
      assets: 5_000_000,
      liabilities: 2_000_000,
      profit: 1_000_000,
    });

    expect(drivers.find((d) => d.key === 'liabilities')?.direction).toBe(
      'down',
    );
    expect(drivers.find((d) => d.key === 'assets')?.direction).toBe('up');
  });

  it('убыток уменьшает стоимость', () => {
    // Здесь знак как раз решает: это одна величина с разным исходом.
    const drivers = buildValueDrivers({
      assets: 1,
      liabilities: 0,
      profit: -500_000,
    });

    const profit = drivers.find((d) => d.key === 'profit');
    expect(profit?.direction).toBe('down');
    expect(profit?.amount).toBe(500_000);
  });

  it('нулевые составляющие не показываются', () => {
    // Строка «Долги: 0 ₽» ничего не сообщает и только удлиняет список.
    const drivers = buildValueDrivers({
      assets: 1_000,
      liabilities: 0,
      profit: 0,
    });

    expect(drivers.map((d) => d.key)).toEqual(['assets']);
  });
});

describe('buildValueSeries', () => {
  it('месяц без данных рвёт линию, а не опускается в ноль', () => {
    // Ноль означал бы, что бизнес в этот месяц ничего не стоил.
    const series = buildValueSeries([
      { month: '2026-01', netAssets: 1_000_000 },
      { month: '2026-02', netAssets: null },
      { month: '2026-03', netAssets: 1_200_000 },
    ]);

    expect(series.map((point) => point.month)).toEqual(['2026-01', '2026-03']);
  });

  it('пустые данные не роняют график', () => {
    expect(buildValueSeries([])).toEqual([]);
    expect(buildValueSeries(undefined as any)).toEqual([]);
  });
});
