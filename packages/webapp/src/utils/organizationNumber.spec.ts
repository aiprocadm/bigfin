import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * З3 карты v37. Дробное число продукт печатает своим знаком.
 *
 * Ставка кредита печаталась как «12.5 %», доли в распределении затрат —
 * «33.3 %», показатели — «1.75». Точка в дроби — язык JavaScript, а не
 * язык продукта: суммы рядом печатаются «1 000,50 ₽».
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

import { formatOrganizationNumber } from './organizationNumber';

describe('печать числа по формату организации', () => {
  beforeEach(() => {
    currency.value = 'RUB';
  });

  it('дробь печатается запятой', () => {
    expect(formatOrganizationNumber(12.5)).toBe('12,5');
  });

  it('целое остаётся целым — лишних копеек не появляется', () => {
    expect(formatOrganizationNumber(20)).toBe('20');
  });

  it('знаков после запятой можно попросить ровно столько, сколько нужно', () => {
    expect(formatOrganizationNumber(1.756, { digits: 2 })).toBe('1,76');
    expect(formatOrganizationNumber(12.5, { digits: 1 })).toBe('12,5');
  });

  it('разряды отделяются пробелом', () => {
    expect(formatOrganizationNumber(1234567.5)).toBe('1\u00a0234\u00a0567,5');
  });

  it('пусто печатается прочерком, а не «NaN»', () => {
    expect(formatOrganizationNumber(null)).toBe('—');
    expect(formatOrganizationNumber(undefined)).toBe('—');
    expect(formatOrganizationNumber(Number.NaN)).toBe('—');
  });

  it('прочерк можно заменить своим', () => {
    expect(formatOrganizationNumber(null, { empty: '0' })).toBe('0');
  });

  it('у английской валюты дробь остаётся точкой', () => {
    currency.value = 'USD';
    expect(formatOrganizationNumber(12.5)).toBe('12.5');
    expect(formatOrganizationNumber(1234567.5)).toBe('1,234,567.5');
  });
});
