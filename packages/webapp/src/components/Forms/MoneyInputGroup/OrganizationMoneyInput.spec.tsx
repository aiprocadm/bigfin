import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * З1 карты v37. Денежное поле принимает сумму так, как продукт её печатает.
 *
 * Замер до починки (настоящий Chrome и jsdom одинаково): напечатанное
 * `1000,50` показывалось как «100,050» и уходило наружу числом `100050` —
 * в сто раз больше. Ошибки не было никакой.
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

import { MoneyInputGroup } from './index';

const typeInto = async (text: string) => {
  const seen: (string | undefined)[] = [];
  render(<MoneyInputGroup onChange={(value) => seen.push(value)} />);
  const input = screen.getByRole('textbox') as HTMLInputElement;
  await userEvent.type(input, text);
  return { input, last: seen[seen.length - 1] };
};

describe('денежное поле продукта', () => {
  beforeEach(() => {
    currency.value = 'RUB';
  });

  it('запятая — это копейки: 1000,50 остаётся тысячей', async () => {
    const { last } = await typeInto('1000,50');

    expect(last).toBe('1000.50');
  });

  it('точка тоже копейки — на цифровой клавиатуре запятой нет', async () => {
    const { last } = await typeInto('1000.50');

    expect(last).toBe('1000.50');
  });

  it('разряды показываются неразрывным пробелом, копейки — запятой', async () => {
    const { input } = await typeInto('1000,50');

    expect(input.value).toBe('1\u00a0000,50');
  });

  it('целая сумма без копеек не портится', async () => {
    const { last, input } = await typeInto('1000');

    expect(last).toBe('1000');
    expect(input.value).toBe('1\u00a0000');
  });

  it('набранный знак копеек не пропадает на полпути', async () => {
    // Поле подчинено своему значению: если наружу отдать «1000», знак
    // копеек сотрётся сразу после нажатия и копейки будет не ввести.
    const { last } = await typeInto('1000,');

    expect(last).toBe('1000.');
  });

  it('готовое значение показывается в формате организации', () => {
    render(<MoneyInputGroup value={'1000.5'} onChange={() => {}} />);

    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      '1\u00a0000,5',
    );
  });

  it('у английской валюты поле остаётся английским', async () => {
    currency.value = 'USD';
    const { last, input } = await typeInto('1,000.50');

    expect(last).toBe('1000.50');
    expect(input.value).toBe('1,000.50');
  });
});
