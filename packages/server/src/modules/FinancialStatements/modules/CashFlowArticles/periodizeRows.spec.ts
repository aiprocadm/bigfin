// © 2026 Bigfin
import * as moment from 'moment';

import {
  buildReportPeriods,
  CASHFLOW_DATE_GROUPS,
  MAX_REPORT_PERIODS,
  PERIOD_TOO_WIDE_FOR_GRANULARITY,
  PeriodTooWideError,
} from './periodizeRows';

/**
 * Нарезка отчёта «Деньги по статьям» на периоды (FT-001 ТЗ-3).
 *
 * Главное свойство — НЕПРЕРЫВНОСТЬ: периоды покрывают отрезок отчёта без
 * щелей и без нахлёстов. Щель — это деньги, которых нет ни в одной колонке;
 * нахлёст — деньги, посчитанные дважды. И то и другое рвёт цепочку «остаток
 * на конец = остаток на начало следующего».
 */
const nextDay = (date: string) =>
  moment(date).add(1, 'day').format('YYYY-MM-DD');

describe('нарезка на периоды', () => {
  it('критерий приёмки 1: январь 2021 — май 2022 по месяцам = 17 колонок', () => {
    const periods = buildReportPeriods('2021-01-01', '2022-05-31', 'month');

    expect(periods).toHaveLength(17);
    expect(periods[0]).toMatchObject({
      fromDate: '2021-01-01',
      toDate: '2021-01-31',
      isPartial: false,
      label: 'Январь 2021',
    });
    expect(periods[16]).toMatchObject({
      fromDate: '2022-05-01',
      toDate: '2022-05-31',
      label: 'Май 2022',
    });
  });

  it('края обрезаются границами отчёта и подписаны датами', () => {
    const periods = buildReportPeriods('2026-01-15', '2026-03-10', 'month');

    expect(periods.map((p) => [p.fromDate, p.toDate, p.isPartial])).toEqual([
      ['2026-01-15', '2026-01-31', true],
      ['2026-02-01', '2026-02-28', false],
      ['2026-03-01', '2026-03-10', true],
    ]);
    // «Январь 2026» над колонкой с 15-го обещало бы весь месяц.
    expect(periods[0].label).toBe('15.01–31.01.2026');
    expect(periods[1].label).toBe('Февраль 2026');
  });

  it('неделя начинается с понедельника', () => {
    // 23.09.2026 — среда.
    const periods = buildReportPeriods('2026-09-23', '2026-10-11', 'week');

    expect(periods.map((p) => p.fromDate)).toEqual([
      '2026-09-23',
      '2026-09-28',
      '2026-10-05',
    ]);
    expect(moment(periods[1].fromDate).isoWeekday()).toBe(1);
    expect(periods[2].toDate).toBe('2026-10-11');
  });

  it('квартал и год подписаны по-русски', () => {
    expect(buildReportPeriods('2026-01-01', '2026-12-31', 'quarter').map((p) => p.label))
      .toEqual(['1 кв. 2026', '2 кв. 2026', '3 кв. 2026', '4 кв. 2026']);
    expect(buildReportPeriods('2025-01-01', '2026-12-31', 'year').map((p) => p.label))
      .toEqual(['2025', '2026']);
  });

  it('«весь период» — одна колонка на весь отрезок', () => {
    expect(buildReportPeriods('2026-01-15', '2026-03-10', 'total')).toEqual([
      {
        key: 'p0',
        fromDate: '2026-01-15',
        toDate: '2026-03-10',
        isPartial: false,
        label: '15.01–10.03.2026',
      },
    ]);
  });

  it('отрезок короче шага масштаба — одна колонка', () => {
    const periods = buildReportPeriods('2026-02-03', '2026-02-09', 'month');

    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({
      fromDate: '2026-02-03',
      toDate: '2026-02-09',
      isPartial: true,
    });
  });

  describe('периоды покрывают отрезок без щелей и нахлёстов', () => {
    const ranges: Array<[string, string]> = [
      ['2026-01-01', '2026-12-31'],
      ['2025-11-17', '2026-02-03'],
      ['2024-02-29', '2024-03-01'],
      ['2026-09-23', '2026-09-23'],
    ];

    CASHFLOW_DATE_GROUPS.forEach((group) => {
      ranges.forEach(([from, to]) => {
        it(`${group}: ${from} … ${to}`, () => {
          const periods = buildReportPeriods(from, to, group);

          expect(periods[0].fromDate).toBe(from);
          expect(periods[periods.length - 1].toDate).toBe(to);
          periods.slice(1).forEach((period, index) => {
            expect(period.fromDate).toBe(nextDay(periods[index].toDate));
          });
          periods.forEach((period) => {
            expect(period.fromDate <= period.toDate).toBe(true);
          });
        });
      });
    });
  });

  describe('предел колонок', () => {
    it(`${MAX_REPORT_PERIODS} дней по дням — можно`, () => {
      const to = moment('2026-01-01')
        .add(MAX_REPORT_PERIODS - 1, 'days')
        .format('YYYY-MM-DD');

      expect(buildReportPeriods('2026-01-01', to, 'day')).toHaveLength(
        MAX_REPORT_PERIODS,
      );
    });

    it('на день больше — понятная ошибка, а не простыня на тысячу колонок', () => {
      const to = moment('2026-01-01')
        .add(MAX_REPORT_PERIODS, 'days')
        .format('YYYY-MM-DD');

      let error: unknown;
      try {
        buildReportPeriods('2026-01-01', to, 'day');
      } catch (thrown) {
        error = thrown;
      }

      expect(error).toBeInstanceOf(PeriodTooWideError);
      expect((error as PeriodTooWideError).code).toBe(
        PERIOD_TOO_WIDE_FOR_GRANULARITY,
      );
      expect((error as Error).message).toContain('крупный масштаб');
    });
  });

  it('конец раньше начала — пусто, а не вечный цикл', () => {
    expect(buildReportPeriods('2026-03-01', '2026-01-01', 'month')).toEqual([]);
    expect(buildReportPeriods('мусор', '2026-01-01', 'month')).toEqual([]);
  });
});
