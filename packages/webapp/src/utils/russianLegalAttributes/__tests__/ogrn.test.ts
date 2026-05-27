import { describe, it, expect } from 'vitest';
import { isValidOgrn } from '../ogrn';

describe('isValidOgrn', () => {
  it('accepts valid 13-digit OGRN', () => {
    // Известный валидный ОГРН (Сбербанк):
    expect(isValidOgrn('1027700132195')).toBe(true);
  });

  it('rejects OGRN with wrong checksum', () => {
    expect(isValidOgrn('1027700132190')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidOgrn('102770013219')).toBe(false); // 12 цифр
    expect(isValidOgrn('10277001321955')).toBe(false); // 14 цифр
  });

  it('rejects non-digits', () => {
    expect(isValidOgrn('102770013219A')).toBe(false);
  });

  it('rejects empty / non-string', () => {
    expect(isValidOgrn('')).toBe(false);
    // @ts-expect-error
    expect(isValidOgrn(null)).toBe(false);
  });
});
