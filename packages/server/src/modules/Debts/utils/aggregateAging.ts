// © 2026 Bigfin
import { bucketIndexForOverdueDays } from './bucketIndexForOverdueDays';

type Period = { beforeDays: number; toDays: number | null };
type OverdueItem = { dueAmount: number; overdueDays: number };

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Раскладывает просроченные документы по корзинам старения.
 * @returns { buckets[], overdueTotal, worstBucketIndex }
 */
export function aggregateAging(
  items: OverdueItem[],
  periods: readonly Period[],
): { buckets: number[]; overdueTotal: number; worstBucketIndex: number } {
  const buckets = periods.map(() => 0);

  items.forEach((item) => {
    const i = bucketIndexForOverdueDays(item.overdueDays, periods);
    if (i >= 0) buckets[i] += item.dueAmount;
  });

  const rounded = buckets.map(round3);
  const overdueTotal = round3(rounded.reduce((a, b) => a + b, 0));
  const worstBucketIndex = rounded.reduce(
    (worst, amount, i) => (amount > 0 ? i : worst),
    -1,
  );

  return { buckets: rounded, overdueTotal, worstBucketIndex };
}
