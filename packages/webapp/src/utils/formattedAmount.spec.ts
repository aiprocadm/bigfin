import { describe, it, expect } from 'vitest';
import { formattedAmount } from './index';

const NBSP = ' ';

/**
 * Р1 карты v18: вебаппный формат сумм зеркалит серверный
 * (packages/server/src/utils/format-number.ts + format-number.spec.ts).
 * До правки RUB печатался как «RUB100 000,00» — буквенный код перед суммой.
 */
describe('formattedAmount', () => {
  it('рубль: разряды NBSP, копейки запятой, знак ₽ ПОСЛЕ суммы', () => {
    expect(formattedAmount(100000, 'RUB')).toBe(`100${NBSP}000,00${NBSP}₽`);
  });

  it('рубль: отрицательная сумма — минус впереди', () => {
    expect(formattedAmount(-500, 'RUB')).toBe(`-500,00${NBSP}₽`);
  });

  it('рубль: ноль печатается как «0,00 ₽»', () => {
    expect(formattedAmount(0, 'RUB')).toBe(`0,00${NBSP}₽`);
  });

  it('noZero: ноль печатается пустой строкой', () => {
    expect(formattedAmount(0, 'RUB', { noZero: true })).toBe('');
  });

  it('доллар: прежний стиль — знак перед суммой, точка и запятая', () => {
    expect(formattedAmount(1500, 'USD')).toBe('$1,500.00');
  });

  it('доллар: отрицательная сумма', () => {
    expect(formattedAmount(-500, 'USD')).toBe('-$500.00');
  });

  it('иена: родной знак (широкий, как на сервере) и ноль дробных знаков', () => {
    expect(formattedAmount(1500, 'JPY')).toBe('￥1,500');
  });

  it('неизвестная валюта: без знака и без дробной части (как раньше)', () => {
    expect(formattedAmount(10, '')).toBe('10');
  });
});
