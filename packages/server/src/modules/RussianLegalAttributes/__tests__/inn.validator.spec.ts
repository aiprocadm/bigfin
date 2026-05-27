import { isValidInn, InnConstraint } from '../validators/inn.validator';

describe('isValidInn', () => {
  describe('10-digit INN (legal entity)', () => {
    it('returns true for valid INN', () => {
      expect(isValidInn('7707083893')).toBe(true);
    });
    it('returns false for wrong checksum', () => {
      expect(isValidInn('7707083890')).toBe(false);
    });
    it('returns false for wrong length', () => {
      expect(isValidInn('770708389')).toBe(false);
      expect(isValidInn('77070838933')).toBe(false);
    });
    it('returns false for non-digits', () => {
      expect(isValidInn('770708389A')).toBe(false);
    });
  });

  describe('12-digit INN', () => {
    it('returns true for valid 12-digit INN', () => {
      expect(isValidInn('500100732259')).toBe(true);
    });
    it('returns false for wrong checksum', () => {
      expect(isValidInn('500100732250')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty / non-string', () => {
      expect(isValidInn('')).toBe(false);
      expect(isValidInn(null as unknown as string)).toBe(false);
    });
  });
});

describe('InnConstraint', () => {
  const constraint = new InnConstraint();

  it('allows null / undefined / empty (nullable)', () => {
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(undefined)).toBe(true);
    expect(constraint.validate('')).toBe(true);
  });

  it('rejects invalid INN', () => {
    expect(constraint.validate('7707083890')).toBe(false);
  });

  it('accepts valid INN', () => {
    expect(constraint.validate('7707083893')).toBe(true);
  });
});
