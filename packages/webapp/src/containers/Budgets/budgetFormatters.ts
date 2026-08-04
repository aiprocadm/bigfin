/**
 * Числа в бюджетах. Пустое значение печатаем прочерком, а не роняем страницу:
 * из-за `undefined.toLocaleString()` вкладка «План-факт» падала целиком.
 */
export const fmt = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('ru-RU');

export const fmtPct = (v: number | null | undefined) =>
  v == null ? '—' : `${v > 0 ? '+' : ''}${v}%`;
