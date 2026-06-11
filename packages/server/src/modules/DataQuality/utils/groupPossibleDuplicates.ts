// © 2026 Bigfin
import { MAX_DUPLICATE_GROUPS } from '../constants';
import { round2, toDateKey, toNumber } from './dataQualityMath';

export interface DuplicateCandidateRow {
  id: number;
  date: Date | string;
  accountId: number;
  credit: number;
  debit: number;
  referenceType: string;
  referenceId: number;
  transactionNumber?: string | null;
  referenceNumber?: string | null;
}

export interface DuplicateGroupEntry {
  transactionId: number;
  referenceType: string;
  referenceId: number;
  transactionNumber: string | null;
  referenceNumber: string | null;
}

export interface DuplicateGroup {
  date: string;
  accountId: number;
  amount: number;
  side: 'credit' | 'debit';
  entries: DuplicateGroupEntry[];
}

export interface DuplicateGroupsResult {
  groups: DuplicateGroup[];
  totalGroups: number;
}

/**
 * Группирует проводки по ключу (date, accountId, amount, side), где amount —
 * ненулевая нога проводки (credit либо debit), side — какая именно нога.
 * Группа считается подозрительной, если в ней ≥2 проводок с РАЗНЫМИ
 * источниками (referenceType, referenceId): две ноги одной проводки имеют
 * один источник — это не дубль; одинаковая сумма из двух разных документов
 * в один день по одному счёту — похоже на задвоенный документ.
 *
 * Детерминированные правила:
 * - нулевые суммы исключаются (служебные/балансирующие строки — не дубли);
 * - если у строки ненулевые обе ноги (нетипично для журнала) — приоритет
 *   у credit-ноги;
 * - сортировка групп по сумме убыв., затем по дате и счёту (стабильность);
 * - выдача ограничена `limit` (по умолчанию MAX_DUPLICATE_GROUPS),
 *   totalGroups — полное число подозрительных групп до лимита.
 */
export function groupPossibleDuplicates(
  rows: DuplicateCandidateRow[],
  limit: number = MAX_DUPLICATE_GROUPS,
): DuplicateGroupsResult {
  interface Bucket {
    date: string;
    accountId: number;
    amount: number;
    side: 'credit' | 'debit';
    rows: DuplicateCandidateRow[];
  }
  const buckets = new Map<string, Bucket>();

  rows.forEach((row) => {
    const credit = toNumber(row.credit);
    const debit = toNumber(row.debit);
    const side: 'credit' | 'debit' = credit !== 0 ? 'credit' : 'debit';
    const amount = round2(credit !== 0 ? credit : debit);
    if (amount === 0) return; // нулевые суммы не считаются дублями

    const date = toDateKey(row.date);
    const key = `${date}|${row.accountId}|${side}|${amount}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.rows.push(row);
    } else {
      buckets.set(key, { date, accountId: row.accountId, amount, side, rows: [row] });
    }
  });

  const suspicious: DuplicateGroup[] = [];
  buckets.forEach((bucket) => {
    const sources = new Set(
      bucket.rows.map((r) => `${r.referenceType}|${r.referenceId}`),
    );
    if (sources.size < 2) return; // один источник — не дубль

    suspicious.push({
      date: bucket.date,
      accountId: bucket.accountId,
      amount: bucket.amount,
      side: bucket.side,
      entries: bucket.rows.map((r) => ({
        transactionId: r.id,
        referenceType: r.referenceType,
        referenceId: r.referenceId,
        transactionNumber: r.transactionNumber ?? null,
        referenceNumber: r.referenceNumber ?? null,
      })),
    });
  });

  suspicious.sort(
    (a, b) =>
      b.amount - a.amount ||
      a.date.localeCompare(b.date) ||
      a.accountId - b.accountId,
  );
  return {
    groups: suspicious.slice(0, limit),
    totalGroups: suspicious.length,
  };
}
