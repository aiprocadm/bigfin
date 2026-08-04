import { describe, it, expect, vi, afterEach } from 'vitest';
import intl from 'react-intl-universal';
import { formatDay, isWeekend } from '../formatDay';

const withLocale = (locale: string) =>
  vi.spyOn(intl, 'getInitOptions').mockReturnValue({ currentLocale: locale } as any);

afterEach(() => vi.restoreAllMocks());

describe('дата дня календаря', () => {
  it('на русском показывает день, месяц и день недели', () => {
    withLocale('ru');

    // 20 августа 2026 — четверг.
    const text = formatDay('2026-08-20');

    expect(text).toContain('20');
    expect(text).toContain('авг');
    expect(text).toContain('чт');
  });

  it('на английском остаётся английской', () => {
    withLocale('en');

    const text = formatDay('2026-08-20');

    expect(text).toMatch(/Aug/);
    expect(text).toMatch(/Thu/i);
  });

  it('без инициализации языка берёт русский', () => {
    vi.spyOn(intl, 'getInitOptions').mockReturnValue({} as any);

    expect(formatDay('2026-08-20')).toContain('авг');
  });

  it('дата не сдвигается на день из-за часового пояса', () => {
    withLocale('ru');

    // Разбор без времени трактуется как UTC и в московском поясе давал
    // бы предыдущий день — проверяем именно первое число месяца.
    expect(formatDay('2026-09-01')).toContain('1');
    expect(formatDay('2026-09-01')).toContain('сент');
  });

  it('битую дату показывает как есть, а не «Invalid Date»', () => {
    withLocale('ru');

    expect(formatDay('не-дата')).toBe('не-дата');
  });
});

describe('выходные', () => {
  it('суббота и воскресенье — выходные', () => {
    expect(isWeekend('2026-08-22')).toBe(true); // суббота
    expect(isWeekend('2026-08-23')).toBe(true); // воскресенье
  });

  it('будни — не выходные', () => {
    expect(isWeekend('2026-08-20')).toBe(false); // четверг
    expect(isWeekend('2026-08-21')).toBe(false); // пятница
  });

  it('битая дата выходным не считается', () => {
    expect(isWeekend('')).toBe(false);
  });
});
