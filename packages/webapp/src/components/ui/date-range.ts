/**
 * Логика периода «с — по» для выбора диапазона (UI-044-2 ТЗ-4).
 *
 * Даты — строки `YYYY-MM-DD`: так они живут в адресе и уходят на сервер, и
 * так не бывает сдвига на сутки из-за часового пояса. Считаем в UTC.
 */
export interface DateRange {
  from: string;
  to: string;
}

export type DateRangePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year';

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  'today',
  'this_week',
  'this_month',
  'last_month',
  'this_quarter',
  'last_quarter',
  'this_year',
  'last_year',
];

const parse = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day));
const lastDay = (year: number, month: number) => utc(year, month + 1, 0);

/** Период готового варианта относительно «сегодня». Неделя — с понедельника. */
export function presetRange(preset: DateRangePreset, today: string): DateRange {
  const d = parse(today);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const q = Math.floor(m / 3) * 3;
  switch (preset) {
    case 'today':
      return { from: iso(d), to: iso(d) };
    case 'this_week': {
      const shift = (d.getUTCDay() + 6) % 7; // понедельник — 0
      const monday = utc(y, m, d.getUTCDate() - shift);
      return { from: iso(monday), to: iso(utc(y, m, d.getUTCDate() - shift + 6)) };
    }
    case 'this_month':
      return { from: iso(utc(y, m, 1)), to: iso(lastDay(y, m)) };
    case 'last_month':
      return { from: iso(utc(y, m - 1, 1)), to: iso(lastDay(y, m - 1)) };
    case 'this_quarter':
      return { from: iso(utc(y, q, 1)), to: iso(lastDay(y, q + 2)) };
    case 'last_quarter':
      return { from: iso(utc(y, q - 3, 1)), to: iso(lastDay(y, q - 1)) };
    case 'this_year':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'last_year':
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:
      return { from: iso(d), to: iso(d) };
  }
}

/** Какой готовый вариант совпадает с периодом — для подсветки в списке. */
export function matchPreset(range: DateRange, today: string): DateRangePreset | null {
  return (
    DATE_RANGE_PRESETS.find((preset) => {
      const candidate = presetRange(preset, today);
      return candidate.from === range.from && candidate.to === range.to;
    }) ?? null
  );
}

/** Период — целые календарные месяцы? Тогда сколько. */
function wholeMonths(range: DateRange): number | null {
  const from = parse(range.from);
  const to = parse(range.to);
  if (from.getUTCDate() !== 1) return null;
  if (iso(lastDay(to.getUTCFullYear(), to.getUTCMonth())) !== range.to) return null;
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth() + 1;
}

/**
 * Сдвиг периода стрелками ‹ › на его же длину.
 *
 * Целые месяцы сдвигаются месяцами: «февраль» → «март» целиком, а не «28 дней
 * вперёд» (иначе после февраля получилось бы 1–28 марта). Квартал и год —
 * это 3 и 12 целых месяцев. Остальное — на число дней.
 */
export function shiftRange(range: DateRange, direction: 1 | -1): DateRange {
  const months = wholeMonths(range);
  const from = parse(range.from);
  if (months) {
    const y = from.getUTCFullYear();
    const m = from.getUTCMonth() + direction * months;
    return { from: iso(utc(y, m, 1)), to: iso(lastDay(y, m + months - 1)) };
  }
  const days = Math.round((parse(range.to).getTime() - from.getTime()) / 86_400_000) + 1;
  const to = parse(range.to);
  return {
    from: iso(utc(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + direction * days)),
    to: iso(utc(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() + direction * days)),
  };
}

/** Период в правильном порядке: выбрали «по» раньше «с» — меняем местами. */
export function normalizeRange(range: DateRange): DateRange {
  return range.from <= range.to ? range : { from: range.to, to: range.from };
}
