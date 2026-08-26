import { describe, it, expect } from 'vitest';
import { formatDateBy } from '@/utils/organizationDate';

/**
 * Ф1/Ф3 карты v25 — дата в полях ввода печатается по формату организации,
 * а не по языку браузера.
 */
describe('формат даты организации', () => {
  const день = new Date(2026, 7, 26);

  it('печатает дату так, как настроено у организации', () => {
    expect(formatDateBy(день, 'DD.MM.YYYY')).toBe('26.08.2026');
  });

  it('уважает другой формат, если организация его выбрала', () => {
    expect(formatDateBy(день, 'YYYY-MM-DD')).toBe('2026-08-26');
  });

  it('формат не задан — печатаем по-русски, а не по-браузерному', () => {
    // null, а не отсутствие аргумента: так приходит поле без настройки.
    expect(formatDateBy(день, null)).toBe('26.08.2026');
    expect(formatDateBy(день, '')).toBe('26.08.2026');
  });

  it('пустая дата даёт пустую строку', () => {
    expect(formatDateBy(null, 'DD.MM.YYYY')).toBe('');
    expect(formatDateBy(undefined, 'DD.MM.YYYY')).toBe('');
  });

  it('битая дата не превращается в «Invalid date»', () => {
    expect(formatDateBy(new Date('не дата'), 'DD.MM.YYYY')).toBe('');
  });

  it('время в поле даты не показывается', () => {
    const сМоментом = new Date(2026, 7, 26, 15, 42);

    expect(formatDateBy(сМоментом, 'DD.MM.YYYY')).toBe('26.08.2026');
  });
});
