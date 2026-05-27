import { describe, it, expect } from 'vitest';
import { isValidOgrnip } from '../ogrnip';

describe('isValidOgrnip', () => {
  it('accepts valid 15-digit OGRNIP', () => {
    // Известный валидный ОГРНИП для теста:
    expect(isValidOgrnip('304500116000157')).toBe(true);
  });

  it('rejects OGRNIP with wrong checksum', () => {
    expect(isValidOgrnip('304500116000150')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidOgrnip('30450011600015')).toBe(false); // 14
    expect(isValidOgrnip('3045001160001577')).toBe(false); // 16
  });

  it('rejects non-digits / empty', () => {
    expect(isValidOgrnip('30450011600015A')).toBe(false);
    expect(isValidOgrnip('')).toBe(false);
  });
});
