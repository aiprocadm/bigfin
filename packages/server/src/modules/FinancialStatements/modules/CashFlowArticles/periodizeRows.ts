// © 2026 Bigfin
import * as moment from 'moment';

import { daysSinceWeekStart } from '@/modules/Settings/organizationCalendar';

/**
 * Колонки-периоды отчёта «Деньги по статьям» (FT-001 ТЗ-3).
 *
 * ЗАЧЕМ. Отчёт показывал одну сумму за весь период. Ответить «в каком месяце
 * уехала аренда» было нельзя — только двенадцать раз сменить период и
 * выписать цифры на бумажку. Теперь отчёт — матрица: статьи × периоды.
 *
 * Здесь только нарезка, без базы: границы периодов — место, где ошибка
 * тихая и дорогая. Колонка, захватившая лишние дни, разрывает цепочку
 * «остаток на конец одного периода = остаток на начало следующего».
 */

/** Масштаб колонок. `total` — одна колонка на весь отрезок. */
export const CASHFLOW_DATE_GROUPS = [
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'total',
] as const;

export type CashFlowDateGroup = (typeof CASHFLOW_DATE_GROUPS)[number];

/**
 * Не больше стольких колонок.
 *
 * ТЗ называет случай «по дням больше 400 дней»; правило общее: таблица из
 * тысячи колонок не читается, а считается и рисуется долго. Человеку честнее
 * сказать «выберите масштаб крупнее», чем показать неподъёмную простыню.
 */
export const MAX_REPORT_PERIODS = 400;

export const PERIOD_TOO_WIDE_FOR_GRANULARITY = 'PERIOD_TOO_WIDE_FOR_GRANULARITY';

export interface ReportPeriod {
  /** Устойчивый ключ колонки: `p0`, `p1`… */
  key: string;
  fromDate: string;
  toDate: string;
  /**
   * Период обрезан границей отчёта: отчёт с 15 января — первая «месячная»
   * колонка идёт с 15-го, а не с 1-го. Иначе в неё попали бы деньги до
   * начала отчёта, и остаток на начало разошёлся бы с остатком в шапке.
   */
  isPartial: boolean;
  /** Подпись для выгрузок (CSV, XLSX, PDF). Экран строит свою. */
  label: string;
}

const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const DATE = 'YYYY-MM-DD';

/**
 * Начало календарной единицы, в которую попадает день.
 *
 * Неделя начинается с дня из настроек организации (FT-006b); по умолчанию —
 * с понедельника.
 */
const unitStart = (
  day: moment.Moment,
  group: CashFlowDateGroup,
  weekStartDay: number,
): moment.Moment =>
  group === 'week'
    ? day.clone().subtract(daysSinceWeekStart(day.isoWeekday(), weekStartDay), 'days')
    : day.clone().startOf(group as moment.unitOfTime.StartOf);

/** Последний день единицы, начатой в `start`. */
const unitEnd = (start: moment.Moment, group: CashFlowDateGroup): moment.Moment =>
  group === 'week'
    ? start.clone().add(6, 'days')
    : start.clone().endOf(group as moment.unitOfTime.StartOf).startOf('day');

const stepUnit = (group: CashFlowDateGroup): moment.unitOfTime.DurationConstructor =>
  group === 'week' ? 'week' : (group as moment.unitOfTime.DurationConstructor);

const range = (from: moment.Moment, to: moment.Moment): string =>
  from.year() === to.year()
    ? `${from.format('DD.MM')}–${to.format('DD.MM.YYYY')}`
    : `${from.format('DD.MM.YYYY')}–${to.format('DD.MM.YYYY')}`;

/** Подпись периода для выгрузок: понятная по-русски, без машинного «2026-01». */
function labelOf(
  group: CashFlowDateGroup,
  from: moment.Moment,
  to: moment.Moment,
  isPartial: boolean,
): string {
  // Обрезанный период подписан датами: «Январь 2026» над колонкой с 15 по
  // 31 число обещало бы весь месяц.
  if (group === 'day') return from.format('DD.MM.YYYY');
  if (isPartial || group === 'week' || group === 'total') return range(from, to);
  if (group === 'month') return `${MONTHS_RU[from.month()]} ${from.year()}`;
  if (group === 'quarter') return `${from.quarter()} кв. ${from.year()}`;
  return String(from.year());
}

export class PeriodTooWideError extends Error {
  readonly code = PERIOD_TOO_WIDE_FOR_GRANULARITY;

  constructor(readonly periodsCount: number) {
    super('Выберите более крупный масштаб или сузьте период');
  }
}

/**
 * Режет отрезок отчёта на периоды по границам календаря.
 *
 * Границы — календарные, а не «скользящие 30 дней»: колонка «Февраль» —
 * это февраль, как в банковской выписке и в голове у человека. Первый и
 * последний период обрезаются границами самого отчёта.
 *
 * @param weekStartDay - день начала недели по ISO (1 — понедельник)
 * @throws PeriodTooWideError — колонок вышло больше MAX_REPORT_PERIODS
 */
export function buildReportPeriods(
  fromDate: moment.MomentInput,
  toDate: moment.MomentInput,
  dateGroup: CashFlowDateGroup = 'month',
  weekStartDay = 1,
): ReportPeriod[] {
  const start = moment(fromDate).startOf('day');
  const end = moment(toDate).startOf('day');

  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return [];

  if (dateGroup === 'total') {
    return [
      {
        key: 'p0',
        fromDate: start.format(DATE),
        toDate: end.format(DATE),
        isPartial: false,
        label: labelOf('total', start, end, false),
      },
    ];
  }

  const periods: ReportPeriod[] = [];
  const cursor = unitStart(start, dateGroup, weekStartDay);

  while (!cursor.isAfter(end)) {
    const unitFrom = cursor.clone();
    const unitTo = unitEnd(cursor, dateGroup);

    const from = moment.max(unitFrom, start);
    const to = moment.min(unitTo, end);
    const isPartial = !from.isSame(unitFrom) || !to.isSame(unitTo);

    periods.push({
      key: `p${periods.length}`,
      fromDate: from.format(DATE),
      toDate: to.format(DATE),
      isPartial,
      label: labelOf(dateGroup, from, to, isPartial),
    });

    if (periods.length > MAX_REPORT_PERIODS) {
      throw new PeriodTooWideError(periods.length);
    }

    cursor.add(1, stepUnit(dateGroup));
    if (dateGroup !== 'week') cursor.startOf(dateGroup as moment.unitOfTime.StartOf);
  }

  return periods;
}
