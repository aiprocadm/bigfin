// © 2026 Bigfin
import {
  computeRevenuePerEmployee,
  enumerateMonths,
  computeProductMargins,
  computeCac,
  computeRomi,
  computeAverageCheck,
  computeLtv,
  computeBreakEven,
} from './financialMath';

describe('computeRevenuePerEmployee', () => {
  it('делит выручку на число сотрудников', () => {
    expect(computeRevenuePerEmployee(900000, 3)).toEqual({
      value: 300000,
      applicable: true,
    });
  });

  it('возвращает applicable=false при нуле сотрудников', () => {
    expect(computeRevenuePerEmployee(900000, 0)).toEqual({
      value: 0,
      applicable: false,
    });
  });

  it('округляет до 2 знаков', () => {
    expect(computeRevenuePerEmployee(100, 3).value).toBe(33.33);
  });

  it('возвращает applicable=false при отрицательном числе сотрудников', () => {
    expect(computeRevenuePerEmployee(900000, -5)).toEqual({
      value: 0,
      applicable: false,
    });
  });
});

describe('computeProductMargins', () => {
  it('сшивает выручку и себестоимость по товару, считает валовую маржу и долю', () => {
    const rows = computeProductMargins(
      { 1: 1000, 2: 500 },
      { 1: 600, 2: 200 },
    );
    expect(rows).toEqual([
      { itemId: 1, revenue: 1000, cost: 600, grossMargin: 400, margin: 0.4 },
      { itemId: 2, revenue: 500, cost: 200, grossMargin: 300, margin: 0.6 },
    ]);
  });

  it('сортирует по валовой марже по убыванию', () => {
    const rows = computeProductMargins(
      { 1: 100, 2: 1000 },
      { 1: 10, 2: 100 },
    );
    expect(rows.map((r) => r.itemId)).toEqual([2, 1]);
  });

  it('товар с выручкой без себестоимости: cost=0, маржа=1', () => {
    const rows = computeProductMargins({ 7: 800 }, {});
    expect(rows).toEqual([
      { itemId: 7, revenue: 800, cost: 0, grossMargin: 800, margin: 1 },
    ]);
  });

  it('товар с себестоимостью без выручки: revenue=0, маржа=0, без деления на ноль', () => {
    const rows = computeProductMargins({}, { 9: 300 });
    expect(rows).toEqual([
      { itemId: 9, revenue: 0, cost: 300, grossMargin: -300, margin: 0 },
    ]);
  });

  it('пустые карты дают пустой массив', () => {
    expect(computeProductMargins({}, {})).toEqual([]);
  });
});

describe('computeCac', () => {
  it('расход ÷ новые клиенты', () => {
    expect(computeCac(10000, 50)).toEqual({ value: 200, applicable: true });
  });

  it('неприменим при нуле новых клиентов', () => {
    expect(computeCac(10000, 0)).toEqual({ value: 0, applicable: false });
  });

  it('округляет до 2 знаков', () => {
    expect(computeCac(100, 3).value).toBe(33.33);
  });
});

describe('computeRomi', () => {
  it('выручка ÷ расход на маркетинг', () => {
    expect(computeRomi(500000, 100000)).toEqual({ value: 5, applicable: true });
  });

  it('неприменим при нулевом расходе', () => {
    expect(computeRomi(500000, 0)).toEqual({ value: 0, applicable: false });
  });
});

describe('computeAverageCheck', () => {
  it('выручка ÷ число клиентов с продажами', () => {
    expect(computeAverageCheck(600000, 30)).toEqual({
      value: 20000,
      applicable: true,
    });
  });

  it('неприменим при нуле клиентов', () => {
    expect(computeAverageCheck(600000, 0)).toEqual({
      value: 0,
      applicable: false,
    });
  });
});

describe('computeLtv', () => {
  it('средний чек × маржа × срок жизни', () => {
    expect(computeLtv(20000, 0.4, 12)).toEqual({
      value: 96000,
      applicable: true,
    });
  });

  it('неприменим при нулевом сроке жизни', () => {
    expect(computeLtv(20000, 0.4, 0)).toEqual({ value: 0, applicable: false });
  });

  it('неприменим при нулевом среднем чеке', () => {
    expect(computeLtv(0, 0.4, 12)).toEqual({ value: 0, applicable: false });
  });
});

describe('computeBreakEven', () => {
  it('постоянные затраты ÷ маржа', () => {
    expect(computeBreakEven(300000, 0.3)).toEqual({
      value: 1000000,
      applicable: true,
    });
  });

  it('неприменима при нулевой марже (недостижима)', () => {
    expect(computeBreakEven(300000, 0)).toEqual({ value: 0, applicable: false });
  });

  it('неприменима при отрицательной марже (недостижима)', () => {
    expect(computeBreakEven(300000, -0.2)).toEqual({
      value: 0,
      applicable: false,
    });
  });

  it('ноль постоянных затрат при положительной марже = 0 (безубыточность сразу)', () => {
    expect(computeBreakEven(0, 0.4)).toEqual({ value: 0, applicable: true });
  });

  it('округляет до 2 знаков', () => {
    expect(computeBreakEven(100, 0.3).value).toBe(333.33);
  });
});

describe('enumerateMonths', () => {
  it('перечисляет месяцы включительно по границам', () => {
    expect(enumerateMonths('2026-01-15', '2026-03-02')).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('один месяц, если from и to в одном месяце', () => {
    expect(enumerateMonths('2026-05-01', '2026-05-31')).toEqual(['2026-05']);
  });

  it('пустой массив, если from позже to', () => {
    expect(enumerateMonths('2026-05-01', '2026-04-01')).toEqual([]);
  });
});
