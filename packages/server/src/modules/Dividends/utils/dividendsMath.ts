// © 2026 Bigfin
// Чистые NaN-safe функции расчёта «доступно/безопасно к выводу» (паттерн ⑧a/㉗).
import {
  PL_EXPENSE_ACCOUNT_TYPES,
  PL_INCOME_ACCOUNT_TYPES,
} from '../constants';

export const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export interface PlAggregateRow {
  accountId: number;
  credit: unknown;
  debit: unknown;
}

export interface PlAccountRef {
  id: number;
  accountType: string;
}

/**
 * Накопленная чистая прибыль по агрегатам леджера (за всё время):
 * доходные счета (credit-normal) дают credit−debit,
 * расходные (debit-normal) вычитаются как debit−credit.
 */
export const computeNetProfit = (
  rows: PlAggregateRow[],
  accounts: PlAccountRef[],
): number => {
  const typeById = new Map(accounts.map((a) => [a.id, a.accountType]));

  const total = rows.reduce((sum, row) => {
    const type = typeById.get(row.accountId);
    const credit = toNumber(row.credit);
    const debit = toNumber(row.debit);

    if (type && PL_INCOME_ACCOUNT_TYPES.includes(type)) {
      return sum + (credit - debit);
    }
    if (type && PL_EXPENSE_ACCOUNT_TYPES.includes(type)) {
      return sum - (debit - credit);
    }
    return sum;
  }, 0);

  return round3(total);
};

/** Сумма зарегистрированных выплат собственнику. */
export const sumPayouts = (payouts: Array<{ amount: unknown }>): number =>
  round3(payouts.reduce((sum, p) => sum + toNumber(p.amount), 0));

/** Непогашенная кредиторка: dueAmount × курс по каждому неоплаченному Bill. */
export const sumUnpaidBills = (
  bills: Array<{ dueAmount: unknown; exchangeRate?: unknown }>,
): number =>
  round3(
    bills.reduce(
      (sum, b) =>
        sum + toNumber(b.dueAmount) * (toNumber(b.exchangeRate) || 1),
      0,
    ),
  );

export interface DividendsSummary {
  netProfit: number;
  totalPaidOut: number;
  available: number;
  unpaidBills: number;
  safe: number;
}

/**
 * Сводка вывода средств:
 * available = netProfit − totalPaidOut;
 * safe = available − unpaidBills (может быть отрицательным — UI показывает 0
 * и предупреждение, сервер не маскирует знак).
 */
export const computeDividendsSummary = (input: {
  netProfit: unknown;
  totalPaidOut: unknown;
  unpaidBills: unknown;
}): DividendsSummary => {
  const netProfit = round3(toNumber(input.netProfit));
  const totalPaidOut = round3(toNumber(input.totalPaidOut));
  const unpaidBills = round3(toNumber(input.unpaidBills));
  const available = round3(netProfit - totalPaidOut);
  const safe = round3(available - unpaidBills);

  return { netProfit, totalPaidOut, available, unpaidBills, safe };
};
