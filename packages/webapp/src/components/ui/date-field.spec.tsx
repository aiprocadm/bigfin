import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

vi.mock('react-intl-universal', () => ({
  default: { get: (key: string) => key },
}));

// Формат организации проверен своими тестами (карта v25) — здесь важно,
// что поле даты зовёт именно его, а не печатает зашитым форматом.
vi.mock('@/utils/organizationDate', () => ({
  formatOrganizationDate: (date: Date) =>
    `орг:${date.toISOString().slice(0, 10)}`,
}));

import { DateField } from './date-field';

/**
 * Ж1 карты v32. Дату печатает продукт, а не браузер, и по формату
 * организации.
 *
 * Семнадцать экранов вводят дату системным `<input type="date">`: у
 * английского браузера это «08/27/2026» в русском продукте. У продукта
 * своё поле даты уже есть (`DatePicker`), но оно печатало зашитым
 * `DD.MM.YYYY` — тот же изъян, что карта v25 чинила у легаси-полей.
 *
 * Экраны хранят дату строкой «ГГГГ-ММ-ДД»; обёртка `DateField` избавляет
 * от перевода строки в дату и обратно в каждом из семнадцати мест.
 */
describe('поле даты продукта', () => {
  it('печатает дату по формату организации', () => {
    render(<DateField value="2026-08-27" onChange={() => {}} />);

    expect(screen.getByText('орг:2026-08-27')).toBeTruthy();
  });

  it('пустое значение показывает подсказку, а не «Invalid date»', () => {
    render(<DateField value="" onChange={() => {}} placeholder="Выберите дату" />);

    expect(screen.getByText('Выберите дату')).toBeTruthy();
  });

  it('испорченное значение не роняет экран', () => {
    render(<DateField value="абырвалг" onChange={() => {}} placeholder="Выберите дату" />);

    expect(screen.getByText('Выберите дату')).toBeTruthy();
  });

  it('наружу отдаёт строку ГГГГ-ММ-ДД, а не объект даты', async () => {
    const { toIsoDate } = await import('./date-field');

    expect(toIsoDate(new Date(2026, 7, 27))).toBe('2026-08-27');
    expect(toIsoDate(undefined)).toBe('');
  });
});

describe('сам DatePicker больше не печатает зашитым форматом', () => {
  it('в компоненте нет вписанного DD.MM.YYYY', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'date-picker.tsx'),
      'utf8',
    );

    expect(source).not.toContain("format('DD.MM.YYYY')");
    expect(source).toContain('formatOrganizationDate(');
  });
});
