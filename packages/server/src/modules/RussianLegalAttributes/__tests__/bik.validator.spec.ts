import { isValidBik, BikConstraint } from '../validators/bik.validator';

describe('isValidBik', () => {
  it('accepts 9 digits starting with 04', () => {
    expect(isValidBik('044525225')).toBe(true);
    expect(isValidBik('044030001')).toBe(true);
  });

  it('rejects BIK not starting with 04', () => {
    expect(isValidBik('144525225')).toBe(false);
    expect(isValidBik('054525225')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidBik('04452522')).toBe(false);
    expect(isValidBik('0445252253')).toBe(false);
  });

  it('rejects non-digits / empty', () => {
    expect(isValidBik('04452522A')).toBe(false);
    expect(isValidBik('')).toBe(false);
  });
});

describe('BikConstraint', () => {
  const constraint = new BikConstraint();

  it('allows null / undefined / empty', () => {
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(undefined)).toBe(true);
    expect(constraint.validate('')).toBe(true);
  });

  it('rejects invalid BIK', () => {
    expect(constraint.validate('144525225')).toBe(false);
  });

  it('accepts valid BIK', () => {
    expect(constraint.validate('044525225')).toBe(true);
  });
});
