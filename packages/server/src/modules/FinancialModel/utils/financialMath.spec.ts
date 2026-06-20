// © 2026 Bigfin
import {
  computeRevenuePerEmployee,
  enumerateMonths,
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
