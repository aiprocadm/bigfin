// © 2026 Bigfin
import { DebtContact, DebtsSideSummary } from '../Debts.interfaces';

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Сводит контакты стороны в итоги: total/current/overdue, суммы по корзинам, ТОП.
 */
export function summarizeSide(
  contacts: DebtContact[],
  topN: number,
): DebtsSideSummary {
  const bucketCount = contacts[0]?.buckets.length ?? 4;
  const buckets = new Array(bucketCount).fill(0);
  let total = 0;
  let current = 0;
  let overdueTotal = 0;

  contacts.forEach((c) => {
    total += c.total;
    current += c.current;
    overdueTotal += c.overdueTotal;
    c.buckets.forEach((b, i) => {
      buckets[i] += b;
    });
  });

  const top = [...contacts].sort((a, b) => b.total - a.total).slice(0, topN);

  return {
    total: round3(total),
    current: round3(current),
    overdueTotal: round3(overdueTotal),
    buckets: buckets.map(round3),
    contacts,
    top,
  };
}
