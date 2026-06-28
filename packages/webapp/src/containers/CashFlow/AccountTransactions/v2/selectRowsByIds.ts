/**
 * Возвращает исходные строки, чьи row-id попали в выбор примитива data-table.
 *
 * Примитив `components/ui/data-table.tsx` отдаёт в `onSelectionChange` массив
 * строковых row-id (как их вернул `getRowId`). Чтобы передать массовое действие
 * в Redux, нужно сопоставить эти строковые id обратно с исходными объектами
 * строк. Эта операция дублировалась в 3 V2-таблицах вкладки «без категории»
 * (Uncategorized / Excluded / Все); различались лишь функция row-id и то, какое
 * поле затем достаётся из строки — поэтому общей вынесена только фильтрация.
 *
 * `Set` вместо `Array.includes` в цикле: O(n) вместо O(n·m).
 */
export function selectRowsByIds<T>(
  rows: T[] | null | undefined,
  selectedRowIds: string[],
  getRowId: (row: T) => string,
): T[] {
  const selected = new Set(selectedRowIds);
  return (rows || []).filter((row) => selected.has(getRowId(row)));
}
