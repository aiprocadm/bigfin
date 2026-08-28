import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * З2 карты v37. Новые разделы вводят деньги полем продукта.
 *
 * Двадцать девять мест в шестнадцати экранах (кредиты, сделки, зарплата,
 * основные средства, бюджеты, дивиденды, календарь платежей, заявки на
 * оплату) брали сумму системным `<input type="number">`. Замер в настоящем
 * Chrome: напечатанное «1000,50» превращается в «100050», и поле при этом
 * считается заполненным верно — ни рамки, ни подсказки. Одинаково на
 * английском и на русском браузере.
 */
const currency = { value: 'RUB' };

vi.mock('@/store/create-store', () => ({
  store: { getState: () => ({}) },
}));

vi.mock('@/store/authentication/authentication.selectors', () => ({
  getCurrentOrganizationFactory: () => () => ({
    base_currency: currency.value,
  }),
}));

import { MoneyField } from './money-field';

const typeInto = async (text: string) => {
  const seen: (number | undefined)[] = [];
  render(<MoneyField onChange={(value) => seen.push(value)} />);
  const input = screen.getByRole('textbox') as HTMLInputElement;
  await userEvent.type(input, text);
  return { input, last: seen[seen.length - 1] };
};

describe('денежное поле новых разделов', () => {
  beforeEach(() => {
    currency.value = 'RUB';
  });

  it('запятая — копейки: 1000,50 остаётся тысячей', async () => {
    const { last } = await typeInto('1000,50');

    expect(last).toBe(1000.5);
  });

  it('точка тоже копейки', async () => {
    const { last } = await typeInto('1000.50');

    expect(last).toBe(1000.5);
  });

  it('вставленное из отчёта «1 000,50» читается верно', async () => {
    const { last } = await typeInto('1 000,50');

    expect(last).toBe(1000.5);
  });

  it('пустое поле отдаёт «не заполнено», а не ноль', () => {
    const seen: (number | undefined)[] = [];
    render(<MoneyField value={12} onChange={(value) => seen.push(value)} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });

    expect(seen[seen.length - 1]).toBeUndefined();
  });

  it('готовое значение печатается в формате организации', () => {
    render(<MoneyField value={1000.5} onChange={() => {}} />);

    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      '1 000,5',
    );
  });

  it('набранный знак копеек не пропадает', async () => {
    render(<MoneyField onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.type(input, '1000,');

    expect(input.value).toBe('1000,');
  });

  it('это не системное числовое поле браузера', () => {
    render(<MoneyField onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    expect(input.getAttribute('type')).toBe('text');
    // Телефон обязан показать цифровую клавиатуру с запятой.
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });
});
