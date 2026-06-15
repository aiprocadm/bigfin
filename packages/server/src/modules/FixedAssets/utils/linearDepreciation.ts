// © 2026 Bigfin
import * as moment from 'moment';

export interface LinearDepreciationInput {
  cost: number;
  salvageValue: number;
  serviceLifeMonths: number;
  commissionedAt: string; // YYYY-MM-DD
}

export interface DepreciationScheduleRow {
  seqNo: number;
  period: string; // YYYY-MM
  amount: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Линейная амортизация: равными долями, начиная с месяца, СЛЕДУЮЩЕГО за
 * вводом в эксплуатацию (ПБУ 6/01). Остаток от округления копеек падает на
 * последний месяц, чтобы сумма строк точно равнялась базе (cost − salvage).
 */
export const linearDepreciation = (
  input: LinearDepreciationInput,
): DepreciationScheduleRow[] => {
  const base = round2(input.cost - input.salvageValue);
  const n = input.serviceLifeMonths;
  if (n <= 0 || base <= 0) return [];

  const perMonth = round2(base / n);
  const start = moment(input.commissionedAt).add(1, 'month').startOf('month');

  const rows: DepreciationScheduleRow[] = [];
  let accumulated = 0;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const amount = isLast ? round2(base - accumulated) : perMonth;
    accumulated = round2(accumulated + amount);
    rows.push({
      seqNo: i + 1,
      period: moment(start).add(i, 'month').format('YYYY-MM'),
      amount,
    });
  }
  return rows;
};
