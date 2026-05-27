import { isValidOgrn, OgrnConstraint } from '../validators/ogrn.validator';

describe('isValidOgrn', () => {
  it('accepts valid 13-digit OGRN', () => {
    expect(isValidOgrn('1027700132195')).toBe(true);
  });

  it('rejects OGRN with wrong checksum', () => {
    expect(isValidOgrn('1027700132190')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidOgrn('102770013219')).toBe(false);
    expect(isValidOgrn('10277001321955')).toBe(false);
  });

  it('rejects non-digits', () => {
    expect(isValidOgrn('102770013219A')).toBe(false);
  });

  it('rejects empty / non-string', () => {
    expect(isValidOgrn('')).toBe(false);
    expect(isValidOgrn(null as unknown as string)).toBe(false);
  });
});

describe('OgrnConstraint', () => {
  const constraint = new OgrnConstraint();

  it('allows null / undefined / empty', () => {
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(undefined)).toBe(true);
    expect(constraint.validate('')).toBe(true);
  });

  it('rejects invalid OGRN', () => {
    expect(constraint.validate('1027700132190')).toBe(false);
  });

  it('accepts valid OGRN', () => {
    expect(constraint.validate('1027700132195')).toBe(true);
  });
});
