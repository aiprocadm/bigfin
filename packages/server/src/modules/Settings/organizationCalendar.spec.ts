// © 2026 Bigfin
import * as moment from 'moment';

import { buildReportPeriods } from '@/modules/FinancialStatements/modules/CashFlowArticles/periodizeRows';
import { makeService } from '@/modules/FinancialStatements/modules/CashFlowArticles/cashFlowArticlesFixture';
import {
  aggregateForecast,
  periodKeyOf,
} from '@/modules/PaymentCalendar/utils/aggregateForecast';
import {
  daysSinceWeekStart,
  DEFAULT_ORGANIZATION_CALENDAR,
  normalizeWeekStartDay,
  readOrganizationCalendar,
} from './organizationCalendar';

/**
 * Календарь организации (FT-006b ТЗ-3): день начала недели и выходные.
 *
 * Критерий приёмки 2: смена дня начала недели меняет границы колонок
 * масштаба «по неделям» и НЕ меняет колонку «Итого».
 */
const store = (values: Record<string, unknown>) => ({
  get: ({ group, key }: { group: string; key: string }) =>
    group === 'organization' ? values[key] : undefined,
});

describe('чтение календаря организации', () => {
  it('не настроено — понедельник, выходные подсвечены, дней недели нет', () => {
    expect(readOrganizationCalendar(store({}))).toEqual(
      DEFAULT_ORGANIZATION_CALENDAR,
    );
    expect(readOrganizationCalendar(null)).toEqual(DEFAULT_ORGANIZATION_CALENDAR);
  });

  it('значения из базы приходят строками — и читаются правильно', () => {
    expect(
      readOrganizationCalendar(
        store({ week_start_day: '7', highlight_weekends: '0', show_weekdays: '1' }),
      ),
    ).toEqual({ weekStartDay: 7, highlightWeekends: false, showWeekdays: true });
  });

  it('мусор в дне недели — понедельник, а не сдвиг на неизвестно сколько', () => {
    expect(normalizeWeekStartDay('0')).toBe(1);
    expect(normalizeWeekStartDay('8')).toBe(1);
    expect(normalizeWeekStartDay('среда')).toBe(1);
    expect(normalizeWeekStartDay(3)).toBe(3);
  });

  it('сколько дней назад началась неделя', () => {
    // Среда (3) при неделе с понедельника — два дня назад, с воскресенья — три.
    expect(daysSinceWeekStart(3, 1)).toBe(2);
    expect(daysSinceWeekStart(3, 7)).toBe(3);
    expect(daysSinceWeekStart(7, 7)).toBe(0);
  });
});

describe('недели отчёта «Деньги» с разного дня', () => {
  it('неделя с воскресенья: колонки начинаются в воскресенье', () => {
    // 23.09.2026 — среда.
    const periods = buildReportPeriods('2026-09-23', '2026-10-17', 'week', 7);

    expect(periods.map((p) => p.fromDate)).toEqual([
      '2026-09-23',
      '2026-09-27',
      '2026-10-04',
      '2026-10-11',
    ]);
    periods.slice(1).forEach((p) => expect(moment(p.fromDate).isoWeekday()).toBe(7));
    // Первая колонка обрезана началом отчёта: неделя шла с воскресенья 20-го.
    expect(periods[0].isPartial).toBe(true);
    expect(periods[1].toDate).toBe('2026-10-03');
  });

  it('с любого дня недели колонки идут без щелей и нахлёстов', () => {
    for (let day = 1; day <= 7; day += 1) {
      const periods = buildReportPeriods('2026-01-01', '2026-03-31', 'week', day);

      expect(periods[0].fromDate).toBe('2026-01-01');
      expect(periods[periods.length - 1].toDate).toBe('2026-03-31');
      periods.slice(1).forEach((period, index) => {
        expect(period.fromDate).toBe(
          moment(periods[index].toDate).add(1, 'day').format('YYYY-MM-DD'),
        );
        expect(moment(period.fromDate).isoWeekday()).toBe(day);
      });
    }
  });

  it('критерий 2: смена начала недели не меняет «Итого» и границы месяцев', async () => {
    const range = { fromDate: '2021-03-10', toDate: '2021-09-20' };
    const monday = await makeService().sheet({ ...range, dateGroup: 'week' });
    const sunday = await makeService({ week_start_day: 7 }).sheet({
      ...range,
      dateGroup: 'week',
    });

    expect(sunday.data.periods[1].fromDate).not.toBe(monday.data.periods[1].fromDate);
    expect(moment(sunday.data.periods[1].fromDate).isoWeekday()).toBe(7);
    expect(sunday.data.netCashFlow).toBe(monday.data.netCashFlow);
    expect(sunday.data.closingBalance).toBe(monday.data.closingBalance);
    expect(sunday.data.unclassified).toBe(monday.data.unclassified);
    expect(sunday.data.rows).toEqual(monday.data.rows);
  });
});

describe('платёжный календарь и календарь организации', () => {
  it('неделя с воскресенья — ключ недели воскресенье', () => {
    // 23.09.2026 — среда.
    expect(periodKeyOf('2026-09-23', 'week')).toBe('2026-09-21');
    expect(periodKeyOf('2026-09-23', 'week', 7)).toBe('2026-09-20');
    expect(periodKeyOf('2026-09-20', 'week', 7)).toBe('2026-09-20');
  });

  it('подсветку выходных можно выключить', () => {
    const days = [
      { date: '2026-09-26', inflow: 0, outflow: 0, balance: 0 },
      { date: '2026-09-27', inflow: 0, outflow: 0, balance: 0 },
    ] as any;

    expect(aggregateForecast(days, 'day', '2026-09-23').map((p) => p.isWeekend)).toEqual([
      true,
      true,
    ]);
    expect(
      aggregateForecast(days, 'day', '2026-09-23', { highlightWeekends: false }).map(
        (p) => p.isWeekend,
      ),
    ).toEqual([false, false]);
  });
});
