import { describe, it, expect } from 'vitest';
import { isValidInn } from '../inn';

describe('isValidInn', () => {
  describe('10-digit INN (legal entity)', () => {
    it('returns true for valid INN with correct checksum', () => {
      // Реальный валидный ИНН ФНС России для теста (10 цифр):
      expect(isValidInn('7707083893')).toBe(true);
    });

    it('returns false for INN with wrong checksum', () => {
      expect(isValidInn('7707083890')).toBe(false);
    });

    it('returns false for INN of wrong length', () => {
      expect(isValidInn('770708389')).toBe(false);
      expect(isValidInn('77070838933')).toBe(false);
    });

    it('returns false for INN with non-digits', () => {
      expect(isValidInn('770708389A')).toBe(false);
    });
  });

  describe('12-digit INN (individual / IP / NPD)', () => {
    it('returns true for valid 12-digit INN', () => {
      // Известный валидный 12-значный ИНН для теста:
      expect(isValidInn('500100732259')).toBe(true);
    });

    it('returns false for 12-digit INN with wrong checksum', () => {
      expect(isValidInn('500100732250')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty string', () => {
      expect(isValidInn('')).toBe(false);
    });

    it('returns false for non-string input', () => {
      // @ts-expect-error — проверяем runtime-защиту
      expect(isValidInn(null)).toBe(false);
      // @ts-expect-error
      expect(isValidInn(undefined)).toBe(false);
    });
  });
});
