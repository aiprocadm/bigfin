import { describe, it, expect, vi, afterEach } from 'vitest';
import intl from 'react-intl-universal';
import { formatShortDate, formatMonth, formatMonthShort } from '../formatShortDate';

const withLocale = (locale: string) =>
  vi.spyOn(intl, 'getInitOptions').mockReturnValue({ currentLocale: locale } as any);

afterEach(() => vi.restoreAllMocks());

describe('короткая дата', () => {
  it('на русском — день, месяц, год', () => {
    withLocale('ru');

    const text = formatShortDate('2026-06-20');

    expect(text).toContain('20');
    expect(text).toContain('июн');
    expect(text).toContain('2026');
  });

  it('на английском остаётся английской', () => {
    withLocale('en');

    expect(formatShortDate('2026-06-20')).toMatch(/Jun/);
  });

  it('дата со временем обрезается и не сдвигается на день', () => {
    withLocale('ru');

    expect(formatShortDate('2026-09-01T00:00:00.000Z')).toContain('1 сент');
  });

  it('пустое значение показывает прочерк, а не «Invalid Date»', () => {
    withLocale('ru');

    expect(formatShortDate(null)).toBe('—');
    expect(formatShortDate('')).toBe('—');
  });

  it('битую строку возвращает как есть', () => {
    withLocale('ru');

    expect(formatShortDate('не-дата')).toBe('не-дата');
  });
});

describe('месяц периода', () => {
  it('коротким видом «2026-07» — это июль 2026', () => {
    withLocale('ru');

    const text = formatMonth('2026-07');

    expect(text).toContain('июль');
    expect(text).toContain('2026');
  });

  it('полную дату тоже понимает', () => {
    withLocale('ru');

    expect(formatMonth('2026-07-01T00:00:00.000Z')).toContain('июль');
  });

  it('на английском остаётся английским', () => {
    withLocale('en');

    expect(formatMonth('2026-07')).toMatch(/July/);
  });

  it('пустое значение показывает прочерк', () => {
    withLocale('ru');

    expect(formatMonth(null)).toBe('—');
  });

  it('битую строку возвращает как есть', () => {
    withLocale('ru');

    expect(formatMonth('не-месяц')).toBe('не-месяц');
  });
});

describe('короткий месяц для оси графика', () => {
  it('«2026-01» на оси — это «янв.»', () => {
    withLocale('ru');

    expect(formatMonthShort('2026-01')).toMatch(/янв/);
  });

  it('года на оси нет — он повторялся бы в каждой подписи', () => {
    withLocale('ru');

    expect(formatMonthShort('2026-01')).not.toContain('2026');
  });

  it('на английском остаётся английским', () => {
    withLocale('en');

    expect(formatMonthShort('2026-01')).toMatch(/Jan/);
  });

  it('пустое значение не рисует подпись', () => {
    withLocale('ru');

    expect(formatMonthShort(null)).toBe('');
  });
});
