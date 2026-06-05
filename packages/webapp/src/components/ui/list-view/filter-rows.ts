/**
 * Клиентский поиск по загруженной странице: оставляет строки, где запрос
 * (подстрока, регистронезависимо, с trim) встречается хотя бы в одном из
 * перечисленных полей. Пустой запрос → исходные строки без изменений.
 */
export function filterRows<T extends Record<string, any>>(
  rows: T[],
  search: string,
  fields: string[],
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    fields
      .map((field) => row[field])
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)),
  );
}
