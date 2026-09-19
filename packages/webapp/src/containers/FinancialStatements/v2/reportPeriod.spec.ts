import { describe, expect, it } from 'vitest';

import {
  QUICK_PERIODS,
  formatRangeLabel,
  matchQuickPeriod,
  reportRange,
} from './reportPeriod';

/** Опорный день: вторник, 14 октября 2026 года. */
const TODAY = '2026-10-14';

describe('reportRange', () => {
  it('текущий месяц', () => {
    expect(reportRange('month', TODAY)).toEqual({
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
    });
  });

  it('прошлый месяц', () => {
    expect(reportRange('prev_month', TODAY)).toEqual({
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
    });
  });

  it('текущий квартал', () => {
    expect(reportRange('quarter', TODAY)).toEqual({
      fromDate: '2026-10-01',
      toDate: '2026-12-31',
    });
  });

  it('прошлый квартал', () => {
    expect(reportRange('prev_quarter', TODAY)).toEqual({
      fromDate: '2026-07-01',
      toDate: '2026-09-30',
    });
  });

  it('текущий год', () => {
    expect(reportRange('year', TODAY)).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
    });
  });

  it('прошлый год', () => {
    expect(reportRange('prev_year', TODAY)).toEqual({
      fromDate: '2025-01-01',
      toDate: '2025-12-31',
    });
  });

  it('прошлый месяц в январе — декабрь прошлого года', () => {
    // Граница года: самый частый случай, когда «минус месяц» считают неверно.
    expect(reportRange('prev_month', '2026-01-10')).toEqual({
      fromDate: '2025-12-01',
      toDate: '2025-12-31',
    });
  });

  it('прошлый месяц 31-го числа не перескакивает через месяц', () => {
    // 31 марта минус месяц — это февраль, а не «31 февраля» → март.
    expect(reportRange('prev_month', '2026-03-31')).toEqual({
      fromDate: '2026-02-01',
      toDate: '2026-02-28',
    });
  });
});

describe('matchQuickPeriod', () => {
  it('узнаёт готовый период', () => {
    expect(matchQuickPeriod(reportRange('quarter', TODAY), TODAY)).toBe(
      'quarter',
    );
  });

  it('ПРОИЗВОЛЬНЫЙ отрезок не выдаётся за готовый', () => {
    // Иначе нажатой выглядела бы кнопка, обещающая не то, что показано.
    expect(
      matchQuickPeriod({ fromDate: '2026-10-03', toDate: '2026-10-20' }, TODAY),
    ).toBe('custom');
  });

  it('пустой отрезок — произвольный', () => {
    expect(matchQuickPeriod(null, TODAY)).toBe('custom');
    expect(matchQuickPeriod({ fromDate: '2026-10-01' }, TODAY)).toBe('custom');
  });

  it('у каждой быстрой кнопки есть подпись', () => {
    expect(QUICK_PERIODS.every((period) => period.labelKey.length > 0)).toBe(
      true,
    );
  });
});

describe('formatRangeLabel', () => {
  it('в одном году год пишется один раз', () => {
    // «1 января 2026 — 31 марта 2026» читается тяжелее, чем без повтора.
    expect(formatRangeLabel({ fromDate: '2026-01-01', toDate: '2026-03-31' }))
      .toBe('1 января — 31 марта 2026 г.');
  });

  it('через границу года год пишется у обеих дат', () => {
    expect(formatRangeLabel({ fromDate: '2025-12-01', toDate: '2026-01-31' }))
      .toBe('1 декабря 2025 г. — 31 января 2026 г.');
  });

  it('мусор вместо дат не роняет подпись', () => {
    expect(formatRangeLabel({ fromDate: 'не дата', toDate: '2026-01-31' }))
      .toBe('');
    expect(formatRangeLabel(null)).toBe('');
  });
});
