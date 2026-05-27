import { describe, it, expect } from 'vitest';
import { isValidKpp } from '../kpp';

describe('isValidKpp', () => {
  it('accepts 9 digits', () => {
    expect(isValidKpp('770701001')).toBe(true);
  });

  it('accepts digit + letter on positions 5-6', () => {
    // КПП может содержать латинские буквы A-Z на позициях 5-6 (для иностранных)
    expect(isValidKpp('7707AB001')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidKpp('77070100')).toBe(false); // 8 знаков
    expect(isValidKpp('7707010011')).toBe(false); // 10 знаков
  });

  it('rejects letters on wrong positions', () => {
    expect(isValidKpp('77070A001')).toBe(false);
  });

  it('rejects empty / non-string', () => {
    expect(isValidKpp('')).toBe(false);
    // @ts-expect-error
    expect(isValidKpp(null)).toBe(false);
  });
});
