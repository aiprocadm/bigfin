// © 2026 Bigfin
/**
 * Колонки «План» и «Отклонение» в отчёте (этап 4 ТЗ, п. 4.4).
 *
 * План заводится по статьям управленческого учёта, а строки отчёта — счета.
 * Сервер уже решил, какой строке какой план принадлежит, и прислал готовые
 * числа. Здесь остаётся одно: **не подписать план строке, которой он не
 * принадлежит**.
 *
 * Поэтому правило простое и жёсткое: план показывается только там, где
 * сервер его дал. У всех прочих строк — прочерк. Пустая ячейка честнее
 * нуля: ноль утверждает, что планировали ничего.
 */

export interface PlanFactSide {
  plan: number;
  fact: number;
  varianceAbs: number;
  variancePct: number | null;
}

export interface PlanFactAccountRow {
  accountId: number;
  plan: number;
  fact: number;
  varianceAbs: number;
  variancePct: number | null;
}

export interface PlanFactData {
  available: boolean;
  budgetName?: string;
  accounts: PlanFactAccountRow[];
  totals: { income: PlanFactSide; expense: PlanFactSide };
}

/** Строка отчёта в том виде, в каком её отдаёт сервер. */
interface ReportRowLike {
  id?: string | number;
}

/**
 * Итоговые строки ОПиУ, которым принадлежит итог по виду.
 * У «Выручки» — план доходов, у «Расходов» — план расходов.
 */
const TOTAL_ROW_SIDE: Record<string, 'income' | 'expense'> = {
  INCOME: 'income',
  EXPENSES: 'expense',
};

/**
 * Что показать в строке: план и отклонение или прочерк.
 * Возвращает null, если этой строке план не принадлежит.
 */
export function planFactForRow(
  row: ReportRowLike,
  data: PlanFactData | undefined,
): { plan: number; varianceAbs: number; variancePct: number | null } | null {
  if (!data?.available) return null;

  const rawId = row?.id;
  if (rawId == null) return null;

  const side = TOTAL_ROW_SIDE[String(rawId)];
  if (side) {
    const totals = data.totals?.[side];
    return totals ? { ...totals } : null;
  }

  const accountId = Number(rawId);
  if (!Number.isFinite(accountId) || accountId <= 0) return null;

  const found = data.accounts?.find((item) => item.accountId === accountId);
  return found ? { ...found } : null;
}

/**
 * Отклонение человеческой строкой: сумма и, если план не нулевой, доля.
 * Перерасход и недобор различаются знаком — как в самом отчёте.
 */
export function formatVariance(
  varianceAbs: number,
  variancePct: number | null,
  formatAmount: (value: number) => string,
): string {
  const amount = formatAmount(varianceAbs);
  if (variancePct == null) return amount;
  return `${amount} (${variancePct > 0 ? '+' : ''}${variancePct}%)`;
}
