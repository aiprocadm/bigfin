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

/** Документ, попавший в находку. */
export interface DuplicateGroupEntry {
  referenceType: string;
  referenceId: number;
  transactionNumber: string | null;
  referenceNumber: string | null;
}

/** Одна находка: несколько документов, похожих друг на друга. */
export interface DuplicateGroup {
  date: string;
  /** Счёт самой крупной совпавшей строки — для подписи. */
  accountId: number;
  /** Самая крупная совпавшая сумма. */
  amount: number;
  side: 'credit' | 'debit';
  /** Сколько строк журнала совпало у этих документов. */
  matchedLegs: number;
  entries: DuplicateGroupEntry[];
}

export interface DuplicateGroupsResult {
  groups: DuplicateGroup[];
  totalGroups: number;
}

/**
 * Ищет задвоенные документы по журналу.
 *
 * Как это работает. Проводки складываются в корзины по ключу
 * (дата, счёт, сумма, сторона). Корзина подозрительна, если в ней есть строки
 * ИЗ РАЗНЫХ документов: две ноги одной проводки — не дубль, а одинаковая
 * сумма из двух разных документов в один день по одному счёту — очень похоже
 * на дважды введённый документ.
 *
 * Почему корзины потом склеиваются. У документа строк несколько: долг,
 * выручка, налог. Если документ ввели дважды, совпадут ВСЕ его строки — и
 * раньше одна ошибка показывалась как три отдельные находки, а счётчик
 * «групп дублей» соответственно втрое преувеличивал. Теперь находки с
 * одинаковым набором документов склеиваются в одну, а число совпавших строк
 * показывается отдельно: чем их больше, тем увереннее совпадение.
 *
 * Прочие правила:
 * - нулевые суммы пропускаются (служебные строки — не дубли);
 * - если у строки ненулевые обе ноги (нетипично) — приоритет у кредита;
 * - сортировка по сумме убыв., затем по дате (стабильность выдачи);
 * - выдача ограничена `limit`, `totalGroups` — полное число находок.
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
      buckets.set(key, {
        date,
        accountId: row.accountId,
        amount,
        side,
        rows: [row],
      });
    }
  });

  /** Находка по набору документов: ключ — отсортированные ссылки. */
  interface Finding {
    date: string;
    accountId: number;
    amount: number;
    side: 'credit' | 'debit';
    matchedLegs: number;
    documents: Map<string, DuplicateGroupEntry>;
  }
  const findings = new Map<string, Finding>();

  buckets.forEach((bucket) => {
    const documentKeys = [
      ...new Set(bucket.rows.map((r) => `${r.referenceType}|${r.referenceId}`)),
    ].sort();

    if (documentKeys.length < 2) return; // один документ — не дубль

    const findingKey = `${bucket.date}|${documentKeys.join(',')}`;
    const finding = findings.get(findingKey);

    if (!finding) {
      const documents = new Map<string, DuplicateGroupEntry>();
      bucket.rows.forEach((row) => {
        const key = `${row.referenceType}|${row.referenceId}`;
        if (documents.has(key)) return;
        documents.set(key, {
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          transactionNumber: row.transactionNumber ?? null,
          referenceNumber: row.referenceNumber ?? null,
        });
      });
      findings.set(findingKey, {
        date: bucket.date,
        accountId: bucket.accountId,
        amount: bucket.amount,
        side: bucket.side,
        matchedLegs: 1,
        documents,
      });
      return;
    }
    finding.matchedLegs += 1;

    // Подписью находки служит самая крупная из совпавших строк.
    if (bucket.amount > finding.amount) {
      finding.amount = bucket.amount;
      finding.accountId = bucket.accountId;
      finding.side = bucket.side;
    }
  });

  const suspicious: DuplicateGroup[] = [...findings.values()].map(
    (finding) => ({
      date: finding.date,
      accountId: finding.accountId,
      amount: finding.amount,
      side: finding.side,
      matchedLegs: finding.matchedLegs,
      entries: [...finding.documents.values()],
    }),
  );

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
