import { describe, it, expect, vi, afterEach } from 'vitest';
import intl from 'react-intl-universal';
import { formatShortDate } from '../formatShortDate';

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
