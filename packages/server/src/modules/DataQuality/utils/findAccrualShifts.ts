// © 2026 Bigfin

/**
 * «Месяц начисления вне периода» (FT-013 ТЗ-3, критерий приёмки 3).
 *
 * Операция с месяцем начисления видна в отчёте о прибыли в одном месяце, а
 * в отчёте о деньгах — в другом. Пока оба месяца внутри периода, итоги за
 * период у двух отчётов сходятся. Когда один из них выходит за границу,
 * ДДС и ОПиУ за период расходятся ровно на такие операции — и человеку надо
 * видеть, на какие именно, а не искать разницу руками.
 */

export interface AccrualShiftRow {
  id: number;
  date: Date | string;
  accrualPeriod: string;
  transactionNumber?: string | null;
  amount?: number | string | null;
  description?: string | null;
}

export interface AccrualShift {
  id: number;
  date: string;
  accrualPeriod: string;
  transactionNumber: string | null;
  amount: number;
  description: string | null;
  /**
   * `out` — оплачена в периоде, начислена вне его (в прибыли периода её
   * нет); `in` — начислена в периоде, оплачена вне его (в деньгах периода
   * её нет).
   */
  kind: 'in' | 'out';
}

const dayOf = (value: Date | string): string =>
  typeof value === 'string'
    ? value.slice(0, 10)
    : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

export function findAccrualShifts(
  rows: AccrualShiftRow[],
  fromDate: string,
  toDate: string,
): { items: AccrualShift[]; count: number } {
  const fromMonth = fromDate.slice(0, 7);
  const toMonth = toDate.slice(0, 7);

  const items: AccrualShift[] = [];
  rows.forEach((row) => {
    if (!row.accrualPeriod) return;
    const day = dayOf(row.date);
    const paidIn = day >= fromDate && day <= toDate;
    const accruedIn = row.accrualPeriod >= fromMonth && row.accrualPeriod <= toMonth;
    if (paidIn === accruedIn) return;

    items.push({
      id: row.id,
      date: day,
      accrualPeriod: row.accrualPeriod,
      transactionNumber: row.transactionNumber ?? null,
      amount: Number(row.amount ?? 0) || 0,
      description: row.description ?? null,
      kind: paidIn ? 'out' : 'in',
    });
  });

  items.sort((a, b) => a.date.localeCompare(b.date));
  return { items, count: items.length };
}
