// © 2026 Bigfin
/**
 * Порядок автоправил (FT-035 ТЗ-3) — без React, чтобы проверять тестом.
 * Верхнее правило срабатывает первым.
 */

/** Перенести элемент с места `from` на место `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Правила в том порядке, в каком они срабатывают. */
export function sortRulesByOrder<T extends { id: number; order?: number | null }>(rules: T[]): T[] {
  return [...rules].sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || Number(a.id) - Number(b.id),
  );
}

/** Изменился ли порядок — чтобы не слать запрос впустую. */
export const orderChanged = (before: number[], after: number[]) =>
  before.length !== after.length || before.some((id, index) => id !== after[index]);
