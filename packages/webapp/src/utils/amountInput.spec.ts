import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * З1 карты v37. Продукт слушает суммы так же, как печатает.
 *
 * Продукт печатает «1 000,50 ₽»: разряды пробелом, копейки запятой. А
 * денежные поля заведены с американскими настройками — запятая для них
 * разделитель разрядов. Человек печатает `1000,50`, получает `100050`, и
 * ошибки при этом нет: в сто раз большая сумма молча уходит в учёт.
 *
 * Правило одно на весь продукт: пробел (в том числе неразрывный) — это
 * разряды; запятая и точка — копейки; вставленное из Excel или из
 * английской выгрузки читается верно.
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

import {
  amountSeparators,
  parseAmountInput,
  formatAmountForInput,
  normalizeTypedSeparators,
} from './amountInput';

const RU = { decimalSeparator: ',', groupSeparator: ' ' };
const EN = { decimalSeparator: '.', groupSeparator: ',' };

describe('разбор напечатанной суммы', () => {
  beforeEach(() => {
    currency.value = 'RUB';
  });

  it('русская запятая — это копейки, а не разряды', () => {
    expect(parseAmountInput('1000,50')).toBe('1000.50');
  });

  it('точка тоже копейки: на цифровой клавиатуре запятой нет', () => {
    expect(parseAmountInput('1000.50')).toBe('1000.50');
  });

  it('пробел между разрядами не мешает — так печатает сам продукт', () => {
    expect(parseAmountInput('1 000,50')).toBe('1000.50');
    expect(parseAmountInput('1 000,50')).toBe('1000.50');
  });

  it('вставленное из английской выгрузки «1,000.50» читается верно', () => {
    expect(parseAmountInput('1,000.50')).toBe('1000.50');
  });

  it('вставленное из немецкой выгрузки «1.000,50» читается верно', () => {
    expect(parseAmountInput('1.000,50')).toBe('1000.50');
  });

  it('повторяющийся знак — это разряды: «1.000.000» — миллион', () => {
    expect(parseAmountInput('1.000.000')).toBe('1000000');
  });

  it('знак рубля и буквы отбрасываются', () => {
    expect(parseAmountInput('1 000,50 ₽')).toBe('1000.50');
  });

  it('минус сохраняется', () => {
    expect(parseAmountInput('-1 000,50')).toBe('-1000.50');
  });

  it('пусто остаётся пустым', () => {
    expect(parseAmountInput('')).toBe('');
    expect(parseAmountInput('   ')).toBe('');
  });

  it('у английской валюты запятая по-прежнему разряды', () => {
    currency.value = 'USD';
    expect(parseAmountInput('1,000.50')).toBe('1000.50');
    expect(parseAmountInput('1,000')).toBe('1000');
  });

  it('у русской организации разряды — пробел, копейки — запятая', () => {
    expect(amountSeparators()).toEqual({
      decimalSeparator: ',',
      groupSeparator: ' ',
    });
  });

  it('у английской валюты разряды — запятая, копейки — точка', () => {
    currency.value = 'USD';
    expect(amountSeparators()).toEqual({
      decimalSeparator: '.',
      groupSeparator: ',',
    });
  });
});

describe('приведение к знакам поля', () => {
  it('точка в русском поле становится запятой', () => {
    expect(normalizeTypedSeparators('1000.50', RU)).toBe('1000,50');
  });

  it('разряды пробелом выбрасываются', () => {
    expect(normalizeTypedSeparators('1 000,50', RU)).toBe('1000,50');
  });

  it('английская строка приводится к русским знакам', () => {
    expect(normalizeTypedSeparators('1,000.50', RU)).toBe('1000,50');
  });

  it('английское поле оставляет свои знаки как было', () => {
    expect(normalizeTypedSeparators('1,000.50', EN)).toBe('1000.50');
  });

  it('знак валюты не сбивает разбор разрядов', () => {
    // Раньше «$» ломал раскладку тройками, и разряды читались как копейки.
    expect(normalizeTypedSeparators('$1,000', EN)).toBe('$1000');
  });

  it('сокращения не трогаем — их разбирает само поле', () => {
    expect(normalizeTypedSeparators('1k', RU)).toBe('1k');
  });
});

describe('печать суммы в поле ввода', () => {
  beforeEach(() => {
    currency.value = 'RUB';
  });

  it('машинное число печатается в формате организации', () => {
    expect(formatAmountForInput('1000.5')).toBe('1000,5');
  });

  it('пустое значение остаётся пустым', () => {
    expect(formatAmountForInput('')).toBe('');
    expect(formatAmountForInput(undefined)).toBe('');
  });

  it('число, а не строка, тоже печатается', () => {
    expect(formatAmountForInput(1000.5)).toBe('1000,5');
  });

  it('у английской валюты остаётся точка', () => {
    currency.value = 'USD';
    expect(formatAmountForInput('1000.5')).toBe('1000.5');
  });
});
