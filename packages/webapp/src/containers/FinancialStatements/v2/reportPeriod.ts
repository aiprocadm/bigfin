import moment from 'moment';

/**
 * Период отчёта: быстрые кнопки и разбор текущего отрезка.
 *
 * ЗАЧЕМ. Период — ГЛАВНЫЙ орган управления отчётом: его меняют чаще всего
 * остального вместе взятого. А жил он внутри панели «Настроить отчёт», и
 * каждая смена стоила четырёх действий: открыть панель, выбрать даты,
 * применить, закрыть.
 *
 * Здесь только расчёт, без React, — так это проверяется тестами.
 */

export type ReportPeriodKind =
  | 'month'
  | 'quarter'
  | 'year'
  | 'prev_month'
  | 'prev_quarter'
  | 'prev_year'
  | 'custom';

export interface ReportRange {
  fromDate: string;
  toDate: string;
}

const format = (value: moment.Moment) => value.format('YYYY-MM-DD');

/**
 * Быстрые периоды в порядке, в котором их и просят.
 *
 * Текущий месяц первым: чаще всего смотрят «как идут дела прямо сейчас».
 * Прошлые периоды следом — по ним закрывают месяц и сверяются с налоговой.
 */
export const QUICK_PERIODS: Array<{
  kind: Exclude<ReportPeriodKind, 'custom'>;
  labelKey: string;
}> = [
  { kind: 'month', labelKey: 'report_period.month' },
  { kind: 'prev_month', labelKey: 'report_period.prev_month' },
  { kind: 'quarter', labelKey: 'report_period.quarter' },
  { kind: 'prev_quarter', labelKey: 'report_period.prev_quarter' },
  { kind: 'year', labelKey: 'report_period.year' },
  { kind: 'prev_year', labelKey: 'report_period.prev_year' },
];

/** Границы периода по его виду. */
export function reportRange(
  kind: Exclude<ReportPeriodKind, 'custom'>,
  today: moment.MomentInput = undefined,
): ReportRange {
  const now = moment(today);

  switch (kind) {
    case 'prev_month': {
      const prev = now.clone().subtract(1, 'month');

      return {
        fromDate: format(prev.clone().startOf('month')),
        toDate: format(prev.clone().endOf('month')),
      };
    }
    case 'prev_quarter': {
      const prev = now.clone().subtract(1, 'quarter');

      return {
        fromDate: format(prev.clone().startOf('quarter')),
        toDate: format(prev.clone().endOf('quarter')),
      };
    }
    case 'prev_year': {
      const prev = now.clone().subtract(1, 'year');

      return {
        fromDate: format(prev.clone().startOf('year')),
        toDate: format(prev.clone().endOf('year')),
      };
    }
    default:
      return {
        fromDate: format(now.clone().startOf(kind)),
        toDate: format(now.clone().endOf(kind)),
      };
  }
}

/**
 * Какой быстрый период сейчас выбран.
 *
 * Отвечает `'custom'`, когда отрезок не совпадает ни с одним готовым. Это не
 * недоработка, а суть: человек вправе задать любые даты, и тогда ни одна
 * кнопка не должна выглядеть нажатой — иначе она обещает не то, что показано.
 */
export function matchQuickPeriod(
  range: Partial<ReportRange> | null | undefined,
  today: moment.MomentInput = undefined,
): ReportPeriodKind {
  if (!range?.fromDate || !range?.toDate) return 'custom';

  const found = QUICK_PERIODS.find(({ kind }) => {
    const candidate = reportRange(kind, today);

    return (
      candidate.fromDate === range.fromDate && candidate.toDate === range.toDate
    );
  });

  return found ? found.kind : 'custom';
}

/**
 * Подпись текущего отрезка: «1 октября — 31 октября 2026».
 *
 * Год пишется один раз, когда обе даты в одном году: «1 января — 31 марта
 * 2026» читается легче, чем «1 января 2026 — 31 марта 2026».
 */
export function formatRangeLabel(
  range: Partial<ReportRange> | null | undefined,
  locale = 'ru',
): string {
  if (!range?.fromDate || !range?.toDate) return '';

  const from = moment(range.fromDate);
  const to = moment(range.toDate);

  if (!from.isValid() || !to.isValid()) return '';

  const sameYear = from.year() === to.year();
  const dayMonth = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
  });
  const dayMonthYear = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return sameYear
    ? `${dayMonth.format(from.toDate())} — ${dayMonthYear.format(to.toDate())}`
    : `${dayMonthYear.format(from.toDate())} — ${dayMonthYear.format(to.toDate())}`;
}
