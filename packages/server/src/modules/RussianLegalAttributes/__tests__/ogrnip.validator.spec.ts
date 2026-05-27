import {
  isValidOgrnip,
  OgrnipConstraint,
} from '../validators/ogrnip.validator';

describe('isValidOgrnip', () => {
  it('accepts valid 15-digit OGRNIP', () => {
    expect(isValidOgrnip('304500116000157')).toBe(true);
  });

  it('rejects OGRNIP with wrong checksum', () => {
    expect(isValidOgrnip('304500116000150')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidOgrnip('30450011600015')).toBe(false);
    expect(isValidOgrnip('3045001160001577')).toBe(false);
  });

  it('rejects non-digits / empty', () => {
    expect(isValidOgrnip('30450011600015A')).toBe(false);
    expect(isValidOgrnip('')).toBe(false);
  });
});

describe('OgrnipConstraint', () => {
  const constraint = new OgrnipConstraint();

  it('allows null / undefined / empty', () => {
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(undefined)).toBe(true);
    expect(constraint.validate('')).toBe(true);
  });

  it('rejects invalid OGRNIP', () => {
    expect(constraint.validate('304500116000150')).toBe(false);
  });

  it('accepts valid OGRNIP', () => {
    expect(constraint.validate('304500116000157')).toBe(true);
  });
});
