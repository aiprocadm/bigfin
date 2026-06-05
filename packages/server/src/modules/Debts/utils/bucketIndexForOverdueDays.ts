// © 2026 Bigfin
type Period = { beforeDays: number; toDays: number | null };

/**
 * Индекс корзины старения по дням просрочки.
 * Правило совпадает с AgingSummaryReport.getContactAgingDueAmount:
 *   beforeDays <= overdueDays && (toDays > overdueDays || toDays === null)
 * @returns индекс корзины, либо -1 если не подходит ни одна.
 */
export function bucketIndexForOverdueDays(
  overdueDays: number,
  periods: readonly Period[],
): number {
  return periods.findIndex(
    (p) =>
      p.beforeDays <= overdueDays &&
      (p.toDays === null || p.toDays > overdueDays),
  );
}
