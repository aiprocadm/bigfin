// © 2026 Bigfin
import { DayBalance } from '../PaymentCalendar.interfaces';
import { daysSinceWeekStart } from '@/modules/Settings/organizationCalendar';

/**
 * Укрупнение платёжного календаря (FIN-019 ТЗ-2).
 *
 * ЗАЧЕМ. Календарь показывал один срез — по дням. Вопрос «что с деньгами на
 * горизонте года» по дневной таблице не читается: триста шестьдесят пять
 * столбцов не помещаются ни на экран, ни в голову.
 *
 * ГЛАВНОЕ ПРАВИЛО: СУММА ДНЕЙ РАВНА ПЕРИОДУ. Поступления и выплаты
 * складываются, а ОСТАТОК — нет: остаток это не поток, а состояние. Сложи
 * мы остатки за месяц — получили бы число, которого не существует. Остаток
 * периода — это остаток ПОСЛЕДНЕГО его дня.
 */
export const FORECAST_GRANULARITIES = [
  'day',
  'week',
  'month',
  'quarter',
  'year',
] as const;

export type ForecastGranularity = (typeof FORECAST_GRANULARITIES)[number];

export interface ForecastPeriod {
  /** Первый день периода, `YYYY-MM-DD`. */
  from: string;
  /** Последний день периода, `YYYY-MM-DD`. */
  to: string;
  inflow: number;
  outflow: number;
  /** Остаток на конец периода — состояние, а не сумма. */
  balance: number;
  /**
   * Прошедшая часть периода: это уже ФАКТ, а не план.
   *
   * При масштабе крупнее дня внутри одного столбца оказывается и то, что
   * уже случилось, и то, что ещё только запланировано. Смешав их молча, мы
   * показали бы план как свершившееся.
   */
  factInflow: number;
  factOutflow: number;
  planInflow: number;
  planOutflow: number;
  /** Выходной — подсвечивается только при дневном масштабе. */
  isWeekend: boolean;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Понедельник недели, в которую попадает дата. */
function startOfWeek(date: Date, weekStartDay = 1): Date {
  const result = new Date(date.getTime());
  // В JS воскресенье — ноль, по ISO — семь. День начала недели берётся из
  // настроек организации (FT-006b); по умолчанию понедельник.
  const isoWeekday = result.getUTCDay() || 7;
  result.setUTCDate(
    result.getUTCDate() - daysSinceWeekStart(isoWeekday, weekStartDay),
  );

  return result;
}

const iso = (date: Date): string => date.toISOString().slice(0, 10);

/** Ключ периода, в который попадает день. */
export function periodKeyOf(
  date: string,
  granularity: ForecastGranularity,
  weekStartDay = 1,
): string {
  const parsed = new Date(`${date}T00:00:00Z`);

  if (granularity === 'day') return date;
  if (granularity === 'week') return iso(startOfWeek(parsed, weekStartDay));
  if (granularity === 'month') return date.slice(0, 7);
  if (granularity === 'year') return date.slice(0, 4);

  const quarter = Math.floor(parsed.getUTCMonth() / 3) + 1;

  return `${parsed.getUTCFullYear()}-Q${quarter}`;
}

/** Суббота и воскресенье. */
export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();

  return day === 0 || day === 6;
}

/**
 * Складывает дни прогноза в периоды выбранного масштаба.
 *
 * @param {DayBalance[]} days дни прогноза по возрастанию даты
 * @param {ForecastGranularity} granularity масштаб
 * @param {string} today сегодня, `YYYY-MM-DD` — параметром, чтобы поведение
 *   можно было проверить, а не зависеть от часового пояса машины
 * @param calendar календарь организации: начало недели и подсветка выходных
 * @returns {ForecastPeriod[]}
 */
export function aggregateForecast(
  days: DayBalance[] = [],
  granularity: ForecastGranularity = 'day',
  today: string = new Date().toISOString().slice(0, 10),
  calendar: { weekStartDay?: number; highlightWeekends?: boolean } = {},
): ForecastPeriod[] {
  const weekStartDay = calendar.weekStartDay ?? 1;
  const highlightWeekends = calendar.highlightWeekends ?? true;
  const byKey = new Map<string, ForecastPeriod>();

  (days ?? []).forEach((day) => {
    if (!day?.date) return;

    const key = periodKeyOf(day.date, granularity, weekStartDay);
    const inflow = Number(day.inflow ?? 0);
    const outflow = Number(day.outflow ?? 0);
    // Прошедшая часть периода — уже факт. Сегодняшний день считается
    // фактом: он наступил, и его движение либо случилось, либо случится
    // сегодня же.
    const isFact = day.date <= today;

    const current =
      byKey.get(key) ??
      ({
        from: day.date,
        to: day.date,
        inflow: 0,
        outflow: 0,
        balance: 0,
        factInflow: 0,
        factOutflow: 0,
        planInflow: 0,
        planOutflow: 0,
        // Выходной имеет смысл только у дня: «выходная неделя» — бессмыслица.
        // Подсветку выходных организация может выключить (FT-006b).
        isWeekend:
          granularity === 'day' && highlightWeekends
            ? isWeekend(day.date)
            : false,
      } as ForecastPeriod);

    current.to = day.date;
    current.inflow = round2(current.inflow + inflow);
    current.outflow = round2(current.outflow + outflow);

    if (isFact) {
      current.factInflow = round2(current.factInflow + inflow);
      current.factOutflow = round2(current.factOutflow + outflow);
    } else {
      current.planInflow = round2(current.planInflow + inflow);
      current.planOutflow = round2(current.planOutflow + outflow);
    }

    // ОСТАТОК НЕ СКЛАДЫВАЕТСЯ: это состояние на конец, а не поток. Берём
    // остаток последнего дня периода — дни приходят по возрастанию.
    current.balance = round2(Number(day.balance ?? 0));

    byKey.set(key, current);
  });

  return [...byKey.values()];
}
