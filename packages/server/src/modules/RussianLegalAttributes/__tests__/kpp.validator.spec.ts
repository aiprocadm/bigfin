import { isValidKpp, KppConstraint } from '../validators/kpp.validator';

describe('isValidKpp', () => {
  it('accepts 9 digits', () => {
    expect(isValidKpp('770701001')).toBe(true);
  });

  it('accepts digit + letter on positions 5-6', () => {
    expect(isValidKpp('7707AB001')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidKpp('77070100')).toBe(false);
    expect(isValidKpp('7707010011')).toBe(false);
  });

  it('rejects letters on wrong positions', () => {
    expect(isValidKpp('77070A001')).toBe(false);
  });

  it('rejects empty / non-string', () => {
    expect(isValidKpp('')).toBe(false);
    expect(isValidKpp(null as unknown as string)).toBe(false);
  });
});

describe('KppConstraint', () => {
  const constraint = new KppConstraint();

  it('allows null / undefined / empty', () => {
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(undefined)).toBe(true);
    expect(constraint.validate('')).toBe(true);
  });

  it('rejects invalid KPP', () => {
    expect(constraint.validate('77070A001')).toBe(false);
  });

  it('accepts valid KPP', () => {
    expect(constraint.validate('770701001')).toBe(true);
  });
});
