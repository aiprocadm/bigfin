import { describe, it, expect } from 'vitest';
import {
  parseNumericInput,
  computeLineAmount,
  computeLinesTotal,
  emptyLineItem,
} from './line-items-editor';

describe('parseNumericInput', () => {
  it('парсит обычное число из строки', () => {
    expect(parseNumericInput('12.5')).toBe(12.5);
  });

  it('терпим к запятой-разделителю (русский ввод)', () => {
    expect(parseNumericInput('1,5')).toBe(1.5);
  });

  it('игнорирует пробелы-разделители тысяч', () => {
    expect(parseNumericInput('1 200,50')).toBe(1200.5);
  });

  it('пустота и null → 0', () => {
    expect(parseNumericInput('')).toBe(0);
    expect(parseNumericInput(null)).toBe(0);
    expect(parseNumericInput(undefined)).toBe(0);
  });

  it('мусор → 0 (не NaN)', () => {
    expect(parseNumericInput('abc')).toBe(0);
  });
});

describe('computeLineAmount', () => {
  it('сумма строки = количество × цена', () => {
    expect(computeLineAmount('3', '100')).toBe(300);
  });

  it('незаполненные поля дают 0', () => {
    expect(computeLineAmount('', '100')).toBe(0);
    expect(computeLineAmount('3', undefined)).toBe(0);
  });
});

describe('computeLinesTotal', () => {
  it('складывает суммы всех строк', () => {
    const total = computeLinesTotal([
      { item_id: '1', quantity: '2', rate: '10' },
      { item_id: '2', quantity: '1', rate: '5.5' },
    ]);
    expect(total).toBe(25.5);
  });

  it('пустой массив → 0', () => {
    expect(computeLinesTotal([])).toBe(0);
  });

  it('пустая строка-позиция не ломает итог', () => {
    expect(
      computeLinesTotal([{ ...emptyLineItem }, undefined, { quantity: '4', rate: '2' }]),
    ).toBe(8);
  });
});
