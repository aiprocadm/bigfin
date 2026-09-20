// © 2026 Bigfin

/**
 * Ярусы прибыли в отчёте о прибылях и убытках (FIN-015 ТЗ-2).
 *
 * ЗАЧЕМ. Собственнику, разговаривающему с банком или инвестором, нужны
 * EBITDA и EBIT — их спрашивают в первом же разговоре. Новичку они мешают:
 * лишние строки в отчёте, смысл которых надо объяснять. Поэтому глубина
 * отчёта — выбор человека, а не решение продукта.
 *
 * ПОЧЕМУ ЯРУС БЕЗ ДАННЫХ НЕ ПРЯЧЕТСЯ. Включив EBITDA и не увидев её, человек
 * решит, что продукт сломался. Показанная строка, равная операционной
 * прибыли, плюс объяснение «амортизация не учитывается: нет операций этого
 * вида» — честный ответ, а исчезновение — молчание.
 */

export type ProfitTierKey = 'operating' | 'ebitda' | 'ebit' | 'ebt' | 'net';

export interface ProfitTierInput {
  revenue: number;
  /** Операционная прибыль: выручка минус все операционные расходы. */
  operatingProfit: number;
  /** Амортизация за период. */
  depreciation?: number;
  otherIncome?: number;
  otherExpenses?: number;
  /** Проценты по кредитам. */
  interestExpense?: number;
  incomeTax?: number;
}

export interface ProfitTierRow {
  key: ProfitTierKey;
  amount: number;
  /**
   * Рентабельность к выручке, %. `null` означает «не определена» — при
   * нулевой выручке делить не на что.
   */
  marginPercent: number | null;
  /** Почему строка выглядит так, а не иначе. `null` — объяснять нечего. */
  note: 'NO_DEPRECIATION' | 'NEGATIVE_REVENUE' | null;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Рентабельность к выручке.
 *
 * НУЛЕВАЯ ВЫРУЧКА ДАЁТ «не определено», а не ноль и не бесконечность. Ноль
 * читается как «работали в ноль», хотя работы не было вовсе; бесконечность
 * вообще не число. Витрина печатает такое как «н/о».
 */
export function marginToRevenue(
  amount: number,
  revenue: number,
): number | null {
  if (!revenue) return null;

  return round2((amount / revenue) * 100);
}

/**
 * Считает выбранные ярусы прибыли.
 *
 * Порядок строк фиксирован и не зависит от порядка выбора: отчёт читают
 * сверху вниз, и «EBITDA выше операционной прибыли» сбило бы с толку.
 *
 * @param {ProfitTierInput} input слагаемые отчёта за период
 * @param {ProfitTierKey[]} tiers какие ярусы показать
 * @returns {ProfitTierRow[]}
 */
export function computeProfitTiers(
  input: ProfitTierInput,
  tiers: ProfitTierKey[] = [],
): ProfitTierRow[] {
  const revenue = Number(input?.revenue ?? 0);
  const operating = Number(input?.operatingProfit ?? 0);
  const depreciation = Number(input?.depreciation ?? 0);
  const otherIncome = Number(input?.otherIncome ?? 0);
  const otherExpenses = Number(input?.otherExpenses ?? 0);
  const interest = Number(input?.interestExpense ?? 0);
  const incomeTax = Number(input?.incomeTax ?? 0);

  const ebitda = operating + depreciation;
  // EBIT — это EBITDA за вычетом амортизации, то есть снова операционная
  // прибыль. Строка существует не ради нового числа, а ради привычного
  // читателю названия: банк спрашивает именно EBIT.
  const ebit = ebitda - depreciation;
  const ebt = ebit + otherIncome - otherExpenses - interest;
  const net = ebt - incomeTax;

  const amountByKey: Record<ProfitTierKey, number> = {
    operating,
    ebitda,
    ebit,
    ebt,
    net,
  };

  const noteFor = (key: ProfitTierKey): ProfitTierRow['note'] => {
    if (key === 'ebitda' && depreciation === 0) return 'NO_DEPRECIATION';
    if (revenue < 0) return 'NEGATIVE_REVENUE';

    return null;
  };

  const ORDER: ProfitTierKey[] = ['operating', 'ebitda', 'ebit', 'ebt', 'net'];

  return ORDER.filter((key) => tiers.includes(key)).map((key) => ({
    key,
    amount: round2(amountByKey[key]),
    marginPercent: marginToRevenue(amountByKey[key], revenue),
    note: noteFor(key),
  }));
}
