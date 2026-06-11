// © 2026 Bigfin
// NaN-safe числовые помощники (паттерн payrollMath ⑧a).

export const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Нормализует дату проводки к ключу 'YYYY-MM-DD' без сдвига часового пояса:
 * строки просто обрезаются, Date форматируется по локальным компонентам
 * (MySQL DATE приходит как Date на локальной полуночи — toISOString()
 * мог бы сдвинуть день назад в положительных таймзонах).
 */
export const toDateKey = (date: Date | string): string => {
  if (typeof date === 'string') return date.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
