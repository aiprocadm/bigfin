// © 2026 Bigfin

/**
 * Слияние плановых операций с фактом в одном реестре (FIN-010 ТЗ-2).
 *
 * ЗАЧЕМ. Человек планирует и разносит в одном месте: «что уже было» и «что
 * будет» — один вопрос, заданный про разные даты. Держать их на двух
 * экранах значит заставить сверять руками.
 *
 * ГЛАВНАЯ ОПАСНОСТЬ — ДУБЛЬ. Материализованная плановая операция уже стала
 * фактом: покажи её обоими способами — и человек увидит один платёж дважды,
 * а итоги сойдутся вдвое больше. Поэтому план, у которого есть факт,
 * выбрасывается ЗДЕСЬ, до показа.
 *
 * ПОЧЕМУ ПЛАНЫ ЛОЖАТСЯ НА ПЕРВУЮ СТРАНИЦУ. Реестр отсортирован по дате
 * УБЫВАНИЮ, а планы — это будущее. При такой сортировке они всегда впереди
 * любого факта, и добавлять их на вторую и следующие страницы не только не
 * нужно, но и неверно: строка «завтрашний платёж» посреди прошлогодних
 * операций выглядела бы ошибкой. Поменяется сортировка — это место
 * придётся пересмотреть, о чём и написано.
 */
export interface MergeableRow {
  /** Дата строки, `YYYY-MM-DD`. */
  date: string;
  /** `fact` — проводка, `planned` — плановая операция. */
  source?: 'fact' | 'planned';
  [key: string]: any;
}

export interface PlannedRow extends MergeableRow {
  id: number;
  /** Статус плановой операции. */
  status?: string | null;
  /** Документ, в который план уже превратился. */
  sourceType?: string | null;
  sourceId?: number | null;
}

/** Статусы плана, который ещё не стал фактом. */
const LIVE_STATUSES = ['planned', 'confirmed'];

/**
 * Сливает плановые строки с фактическими.
 *
 * @param {MergeableRow[]} facts строки-факты текущей страницы
 * @param {PlannedRow[]} planned плановые операции периода
 * @param {boolean} isFirstPage только на первой странице планы имеют смысл
 * @returns {MergeableRow[]}
 */
export function mergePlannedRows(
  facts: MergeableRow[] = [],
  planned: PlannedRow[] = [],
  isFirstPage = true,
): MergeableRow[] {
  const factRows: MergeableRow[] = (facts ?? []).map((row) => ({
    ...row,
    source: row.source ?? ('fact' as const),
  }));

  if (!isFirstPage) return factRows;

  /**
   * Ключи документов, которые УЖЕ есть в факте. По ним отсеиваются планы,
   * успевшие материализоваться: иначе одна операция покажется двумя.
   */
  const factKeys = new Set<string>(
    factRows
      .filter((row) => row.referenceType && row.referenceId)
      .map((row) => `${row.referenceType}:${row.referenceId}`),
  );

  const alive = (planned ?? []).filter((row) => {
    const status = String(row.status ?? '').toLowerCase();
    if (!LIVE_STATUSES.includes(status)) return false;

    // План, породивший документ, показывается только как факт.
    if (row.sourceType && row.sourceId) {
      return !factKeys.has(`${row.sourceType}:${row.sourceId}`);
    }

    return true;
  });

  const plannedRows = alive.map((row) => ({
    ...row,
    source: 'planned' as const,
  }));

  // Сортировка по дате убыванию — та же, что у списка. Одинаковые даты
  // отдают первенство плану: он про будущее, и человек ищет его первым.
  return [...plannedRows, ...factRows].sort((left, right) => {
    if (left.date === right.date) {
      if (left.source === right.source) return 0;
      return left.source === 'planned' ? -1 : 1;
    }
    return left.date < right.date ? 1 : -1;
  });
}
