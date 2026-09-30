import type { ForecastDay } from './mapForecast';

/** Элемент списка календаря: день с движением или свёрнутая серия тихих дней. */
export type CalendarListItem =
  | { kind: 'day'; day: ForecastDay }
  | { kind: 'quiet'; from: string; to: string; days: ForecastDay[] };

/**
 * Пустые дни — свёрнуты (UI-050-1 ТЗ-4, O10).
 *
 * БЫЛО: каждый день горизонта — строка «Остаток: …», даже когда в нём не
 * происходит ничего. Месяц — тридцать одинаковых строк, и три дня с
 * платежами тонули среди них.
 *
 * СТАЛО: подряд идущие дни без операций сворачиваются в одну строку
 * «N дней без движения». Сегодняшний день не сворачивается никогда — от него
 * человек отсчитывает; одиночный пустой день тоже остаётся днём: строка
 * «1 день без движения» не короче самого дня.
 */
export function groupQuietDays(days: ForecastDay[], today: string): CalendarListItem[] {
  const items: CalendarListItem[] = [];
  let run: ForecastDay[] = [];

  const flush = () => {
    if (run.length === 1) items.push({ kind: 'day', day: run[0] });
    if (run.length > 1) items.push({ kind: 'quiet', from: run[0].date, to: run[run.length - 1].date, days: run });
    run = [];
  };

  days.forEach((day) => {
    const quiet = (day.lines ?? []).length === 0 && day.date !== today;
    if (quiet) {
      run.push(day);
      return;
    }
    flush();
    items.push({ kind: 'day', day });
  });
  flush();
  return items;
}
