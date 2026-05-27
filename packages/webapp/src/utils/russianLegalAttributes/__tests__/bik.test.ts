import { describe, it, expect } from 'vitest';
import { isValidBik } from '../bik';

describe('isValidBik', () => {
  it('accepts 9 digits starting with 04', () => {
    expect(isValidBik('044525225')).toBe(true); // Сбер
    expect(isValidBik('044030001')).toBe(true); // ЦБ РФ СПб
  });

  it('rejects BIK not starting with 04', () => {
    expect(isValidBik('144525225')).toBe(false);
    expect(isValidBik('054525225')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidBik('04452522')).toBe(false); // 8
    expect(isValidBik('0445252253')).toBe(false); // 10
  });

  it('rejects non-digits / empty', () => {
    expect(isValidBik('04452522A')).toBe(false);
    expect(isValidBik('')).toBe(false);
  });
});
