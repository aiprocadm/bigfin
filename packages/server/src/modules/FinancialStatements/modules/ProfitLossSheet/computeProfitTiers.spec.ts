// © 2026 Bigfin
import {
  computeProfitTiers,
  marginToRevenue,
} from './computeProfitTiers';

/**
 * Ярусы прибыли (FIN-015 ТЗ-2).
 *
 * Эти числа человек называет банку и инвестору. Ошибка здесь не косметика:
 * по ней принимают решение о кредите.
 */
describe('ярусы прибыли', () => {
  const base = {
    revenue: 1_000_000,
    operatingProfit: 200_000,
    depreciation: 50_000,
    otherIncome: 10_000,
    otherExpenses: 4_000,
    interestExpense: 30_000,
    incomeTax: 20_000,
  };

  it('EBITDA = операционная прибыль + амортизация', () => {
    const [row] = computeProfitTiers(base, ['ebitda']);

    expect(row.amount).toBe(250_000);
  });

  it('EBIT возвращается к операционной прибыли', () => {
    // Строка существует ради привычного банку названия, а не ради нового
    // числа: EBITDA минус амортизация — это снова операционная прибыль.
    const [row] = computeProfitTiers(base, ['ebit']);

    expect(row.amount).toBe(base.operatingProfit);
  });

  it('EBT учитывает прочие доходы, расходы и проценты', () => {
    const [row] = computeProfitTiers(base, ['ebt']);

    // 200 000 + 10 000 − 4 000 − 30 000
    expect(row.amount).toBe(176_000);
  });

  it('чистая прибыль — это EBT за вычетом налога', () => {
    const [row] = computeProfitTiers(base, ['net']);

    expect(row.amount).toBe(156_000);
  });

  it('второй набор: бизнес без амортизации и процентов', () => {
    const rows = computeProfitTiers(
      { revenue: 500_000, operatingProfit: 120_000 },
      ['operating', 'ebitda', 'ebit', 'ebt', 'net'],
    );

    expect(rows.map((row) => row.amount)).toEqual([
      120_000, 120_000, 120_000, 120_000, 120_000,
    ]);
  });

  it('третий набор: убыток', () => {
    const rows = computeProfitTiers(
      {
        revenue: 300_000,
        operatingProfit: -80_000,
        depreciation: 20_000,
        incomeTax: 0,
      },
      ['operating', 'ebitda', 'net'],
    );

    expect(rows[0].amount).toBe(-80_000);
    expect(rows[1].amount).toBe(-60_000);
    expect(rows[2].amount).toBe(-80_000);
  });

  describe('рентабельность', () => {
    it('считается к выручке в процентах', () => {
      const [row] = computeProfitTiers(base, ['operating']);

      expect(row.marginPercent).toBe(20);
    });

    it('при НУЛЕВОЙ выручке не определена, а не ноль и не бесконечность', () => {
      // Ноль читается как «работали в ноль», хотя работы не было вовсе.
      // Бесконечность — вообще не число. Витрина печатает такое как «н/о».
      expect(marginToRevenue(100, 0)).toBeNull();

      const [row] = computeProfitTiers(
        { revenue: 0, operatingProfit: -5_000 },
        ['operating'],
      );

      expect(row.marginPercent).toBeNull();
    });

    it('при отрицательной выручке считается, но помечается', () => {
      // Возвраты превысили продажи — показатель трудно истолковать, и
      // молча показать его значило бы ввести в заблуждение.
      const [row] = computeProfitTiers(
        { revenue: -10_000, operatingProfit: -12_000 },
        ['operating'],
      );

      expect(row.marginPercent).not.toBeNull();
      expect(row.note).toBe('NEGATIVE_REVENUE');
    });
  });

  describe('ярус без данных', () => {
    it('EBITDA без амортизации НЕ ПРЯЧЕТСЯ, а объясняет себя', () => {
      // Включив EBITDA и не увидев её, человек решит, что продукт сломался.
      const [row] = computeProfitTiers(
        { revenue: 100_000, operatingProfit: 10_000, depreciation: 0 },
        ['ebitda'],
      );

      expect(row.amount).toBe(10_000);
      expect(row.note).toBe('NO_DEPRECIATION');
    });

    it('с амортизацией пояснения нет', () => {
      const [row] = computeProfitTiers(base, ['ebitda']);

      expect(row.note).toBeNull();
    });
  });

  describe('состав и порядок строк', () => {
    it('показываются только выбранные ярусы', () => {
      const rows = computeProfitTiers(base, ['ebitda']);

      expect(rows).toHaveLength(1);
      expect(rows[0].key).toBe('ebitda');
    });

    it('порядок фиксирован и не зависит от порядка выбора', () => {
      // Отчёт читают сверху вниз: «EBITDA выше операционной прибыли» сбило
      // бы с толку даже того, кто сам их выбрал.
      const rows = computeProfitTiers(base, ['net', 'operating', 'ebitda']);

      expect(rows.map((row) => row.key)).toEqual([
        'operating',
        'ebitda',
        'net',
      ]);
    });

    it('без выбора ярусов строк нет', () => {
      expect(computeProfitTiers(base, [])).toEqual([]);
    });
  });
});
