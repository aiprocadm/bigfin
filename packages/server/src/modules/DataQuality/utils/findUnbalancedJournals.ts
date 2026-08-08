// © 2026 Bigfin
import { round2, toNumber } from './dataQualityMath';

/** Строка журнала, нужная для проверки сходимости. */
export interface JournalRow {
  referenceType: string;
  referenceId: number;
  date: string | Date;
  debit: number;
  credit: number;
  transactionNumber?: string | null;
  referenceNumber?: string | null;
}

/** Документ, чей журнал не сходится. */
export interface UnbalancedJournal {
  referenceType: string;
  referenceId: number;
  date: string | Date;
  debit: number;
  credit: number;
  /** Дебет минус кредит: сколько «висит» непарным. */
  difference: number;
  documentNumber: string | null;
  entriesCount: number;
}

export interface UnbalancedJournalsResult {
  journals: UnbalancedJournal[];
  /** Всего найдено документов с перекосом (до ограничения выдачи). */
  totalJournals: number;
  /** Сумма модулей расхождений — величина проблемы одним числом. */
  totalDifference: number;
}

/**
 * Допуск в половину копейки: суммы строк считаются с полной точностью, а
 * часть входных величин приходит из округлённых колонок, поэтому «хвосты»
 * вещественных чисел расхождением не считаются. Тот же порог, что и у
 * предохранителя записи журнала (Ledger.isBalanced).
 */
export const BALANCE_TOLERANCE = 0.005;

/**
 * Ищет документы, у которых дебет не сошёлся с кредитом.
 *
 * Двойная запись — основа учёта: если по документу дебет не равен кредиту,
 * баланс организации перекошен ровно на эту разницу, и все отчёты врут.
 * Такие перекосы записывались молча (перекос списания ОС и счёта с НДС жили
 * в базе, пока их не нашла приёмка), поэтому нужен отдельный отчёт.
 *
 * @param {JournalRow[]} rows — строки журнала за период.
 * @param {number} limit — сколько документов вернуть (самые крупные первыми).
 */
export function findUnbalancedJournals(
  rows: JournalRow[],
  limit = 100,
): UnbalancedJournalsResult {
  const byDocument = new Map<
    string,
    {
      referenceType: string;
      referenceId: number;
      date: string | Date;
      debit: number;
      credit: number;
      documentNumber: string | null;
      entriesCount: number;
    }
  >();

  for (const row of rows) {
    if (!row.referenceType || row.referenceId == null) continue;

    const key = `${row.referenceType}:${row.referenceId}`;
    const existing = byDocument.get(key);
    const debit = toNumber(row.debit);
    const credit = toNumber(row.credit);

    if (existing) {
      existing.debit += debit;
      existing.credit += credit;
      existing.entriesCount += 1;
      existing.documentNumber =
        existing.documentNumber ||
        row.transactionNumber ||
        row.referenceNumber ||
        null;
    } else {
      byDocument.set(key, {
        referenceType: row.referenceType,
        referenceId: row.referenceId,
        date: row.date,
        debit,
        credit,
        documentNumber: row.transactionNumber || row.referenceNumber || null,
        entriesCount: 1,
      });
    }
  }

  const unbalanced: UnbalancedJournal[] = [];

  byDocument.forEach((doc) => {
    const difference = round2(doc.debit - doc.credit);
    if (Math.abs(difference) < BALANCE_TOLERANCE) return;

    unbalanced.push({
      referenceType: doc.referenceType,
      referenceId: doc.referenceId,
      date: doc.date,
      debit: round2(doc.debit),
      credit: round2(doc.credit),
      difference,
      documentNumber: doc.documentNumber,
      entriesCount: doc.entriesCount,
    });
  });

  // Самые крупные перекосы первыми: с них и начинают разбираться.
  unbalanced.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

  const totalDifference = round2(
    unbalanced.reduce((sum, doc) => sum + Math.abs(doc.difference), 0),
  );

  return {
    journals: unbalanced.slice(0, limit),
    totalJournals: unbalanced.length,
    totalDifference,
  };
}
