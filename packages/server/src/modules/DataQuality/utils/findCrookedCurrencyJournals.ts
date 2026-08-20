// © 2026 Bigfin
import { round2, toNumber } from './dataQualityMath';

/** Ручная проводка, как её видит детектор. */
export interface CrookedJournalCandidate {
  id: number;
  journalNumber: string | null;
  date: string | Date;
  /** Сумма документа В ВАЛЮТЕ (сумма кредитов строк). */
  amount: number;
  currencyCode: string;
  exchangeRate: number;
}

/** Строка журнала ручной проводки. */
export interface CrookedJournalGlRow {
  referenceId: number;
  debit: number;
  credit: number;
}

/** Кривая проводка: журнал лёг один к одному с валютой. */
export interface CrookedCurrencyJournal {
  journalId: number;
  journalNumber: string | null;
  date: string | Date;
  currencyCode: string;
  exchangeRate: number;
  /** Сумма документа в валюте. */
  amount: number;
  /** Что лежит в журнале (дебет). */
  journalTotal: number;
  /** Что должно лежать: amount × курс. */
  expectedTotal: number;
  /** Недостача в журнале (базовая валюта). */
  difference: number;
}

export interface CrookedCurrencyJournalsResult {
  journals: CrookedCurrencyJournal[];
  totalJournals: number;
  /** Суммарная недостача — величина беды одним числом. */
  totalDifference: number;
}

/** Тот же копеечный допуск, что и у остальных проверок качества данных. */
const TOLERANCE = 0.005;

/**
 * Ищет ручные проводки в валюте, записанные в журнал БЕЗ умножения на курс
 * (вопрос 28 карты v16 — накопились до починки Р1 среза 3).
 *
 * Признак кривизны: сумма журнала совпадает с суммой документа В ВАЛЮТЕ
 * (один к одному), хотя должна совпадать с суммой × курс. Проводка с курсом 1
 * неотличима от кривой, но у неё и недостачи нет — пропускаем. Черновики без
 * строк журнала пропускаются: перепроводить там нечего.
 */
export function findCrookedCurrencyJournals(
  candidates: CrookedJournalCandidate[],
  glRows: CrookedJournalGlRow[],
  baseCurrency: string,
  limit = 100,
): CrookedCurrencyJournalsResult {
  const debitByJournal = new Map<number, number>();

  for (const row of glRows) {
    if (row.referenceId == null) continue;
    debitByJournal.set(
      row.referenceId,
      (debitByJournal.get(row.referenceId) ?? 0) + toNumber(row.debit),
    );
  }

  const crooked: CrookedCurrencyJournal[] = [];

  for (const journal of candidates) {
    const rate = toNumber(journal.exchangeRate);
    const amount = toNumber(journal.amount);

    if (!journal.currencyCode || journal.currencyCode === baseCurrency) continue;
    if (!(rate > 0) || Math.abs(rate - 1) < Number.EPSILON) continue;
    if (!(amount > 0)) continue;

    const journalTotal = debitByJournal.get(journal.id);
    if (journalTotal == null) continue;

    const expectedTotal = round2(amount * rate);
    const matchesForeign = Math.abs(journalTotal - amount) < TOLERANCE;
    const matchesExpected = Math.abs(journalTotal - expectedTotal) < TOLERANCE;

    if (!matchesForeign || matchesExpected) continue;

    crooked.push({
      journalId: journal.id,
      journalNumber: journal.journalNumber ?? null,
      date: journal.date,
      currencyCode: journal.currencyCode,
      exchangeRate: rate,
      amount: round2(amount),
      journalTotal: round2(journalTotal),
      expectedTotal,
      difference: round2(expectedTotal - journalTotal),
    });
  }

  // Самые крупные недостачи первыми: с них и начинают разбираться.
  crooked.sort((a, b) => b.difference - a.difference);

  return {
    journals: crooked.slice(0, limit),
    totalJournals: crooked.length,
    totalDifference: round2(
      crooked.reduce((sum, item) => sum + item.difference, 0),
    ),
  };
}
