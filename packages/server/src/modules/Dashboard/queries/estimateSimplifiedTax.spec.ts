import { estimateSimplifiedTax } from './estimateSimplifiedTax';
import { TaxRegime } from '@/modules/RussianLegalAttributes/constants';

/**
 * Н3 карты v22 — оценка налога на упрощёнке за текущий квартал.
 */
describe('оценка налога на упрощёнке', () => {
  it('на «Доходах» берёт 6 % от выручки', () => {
    const result = estimateSimplifiedTax({
      regime: TaxRegime.USN_INCOME,
      income: 1_000_000,
      // Расходы на этом режиме налог не уменьшают — специально ставим
      // большими, чтобы поймать ошибку, если их вычтут.
      expenses: 900_000,
      today: '2026-08-26',
    });

    expect(result?.amount).toBe(60_000);
    expect(result?.ratePercent).toBe(6);
    expect(result?.base).toBe(1_000_000);
  });

  it('на «Доходах минус расходах» берёт 15 % от разницы', () => {
    const result = estimateSimplifiedTax({
      regime: TaxRegime.USN_INCOME_EXPENSE,
      income: 1_000_000,
      expenses: 400_000,
      today: '2026-08-26',
    });

    expect(result?.base).toBe(600_000);
    expect(result?.amount).toBe(90_000);
  });

  it('расходы больше доходов — платить нечего, а не «минус налог»', () => {
    const result = estimateSimplifiedTax({
      regime: TaxRegime.USN_INCOME_EXPENSE,
      income: 100_000,
      expenses: 250_000,
      today: '2026-08-26',
    });

    expect(result?.amount).toBe(0);
    expect(result?.base).toBe(-150_000);
  });

  it('на автоматизированной упрощёнке ставка 8 %', () => {
    const result = estimateSimplifiedTax({
      regime: TaxRegime.AUSN,
      income: 500_000,
      expenses: 0,
      today: '2026-08-26',
    });

    expect(result?.amount).toBe(40_000);
  });

  it('на патенте и общей системе оценки нет — там она была бы выдумкой', () => {
    for (const regime of [TaxRegime.PATENT, TaxRegime.OSNO]) {
      expect(
        estimateSimplifiedTax({
          regime,
          income: 1_000_000,
          expenses: 0,
          today: '2026-08-26',
        }),
      ).toBeNull();
    }
  });

  it('режим не задан — оценки нет', () => {
    // null, а не отсутствие поля: так приходит пустой режим организации.
    expect(
      estimateSimplifiedTax({
        regime: null,
        income: 1_000_000,
        expenses: 0,
        today: '2026-08-26',
      }),
    ).toBeNull();
  });

  it('период — текущий квартал целиком', () => {
    const result = estimateSimplifiedTax({
      regime: TaxRegime.USN_INCOME,
      income: 0,
      expenses: 0,
      today: '2026-08-26',
    });

    expect(result?.fromDate).toBe('2026-07-01');
    expect(result?.toDate).toBe('2026-09-30');
  });

  it('срок уплаты — 28-е число месяца после квартала', () => {
    const q3 = estimateSimplifiedTax({
      regime: TaxRegime.USN_INCOME,
      income: 0,
      expenses: 0,
      today: '2026-08-26',
    });
    expect(q3?.dueDate).toBe('2026-10-28');

    const q1 = estimateSimplifiedTax({
      regime: TaxRegime.USN_INCOME,
      income: 0,
      expenses: 0,
      today: '2026-02-10',
    });
    expect(q1?.dueDate).toBe('2026-04-28');
  });

  it('за последний квартал срок — 28 марта следующего года', () => {
    const q4 = estimateSimplifiedTax({
      regime: TaxRegime.USN_INCOME,
      income: 0,
      expenses: 0,
      today: '2026-11-15',
    });

    expect(q4?.toDate).toBe('2026-12-31');
    expect(q4?.dueDate).toBe('2027-03-28');
  });

  it('копейки округляются до двух знаков', () => {
    const result = estimateSimplifiedTax({
      regime: TaxRegime.USN_INCOME,
      income: 10_000.55,
      expenses: 0,
      today: '2026-08-26',
    });

    expect(result?.amount).toBe(600.03);
  });

  it('битая дата не роняет расчёт', () => {
    expect(
      estimateSimplifiedTax({
        regime: TaxRegime.USN_INCOME,
        income: 100,
        expenses: 0,
        today: 'вчера',
      }),
    ).toBeNull();
  });
});
