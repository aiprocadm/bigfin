import { activeStatus, formatBalance, isNegativeBalance } from './list-format';

describe('activeStatus', () => {
  it('maps active flag to status key', () => {
    expect(activeStatus(true)).toBe('active');
    expect(activeStatus(false)).toBe('inactive');
  });
});

describe('isNegativeBalance', () => {
  it('detects negative balances only', () => {
    expect(isNegativeBalance(-8200)).toBe(true);
    expect(isNegativeBalance(0)).toBe(false);
    expect(isNegativeBalance(124500)).toBe(false);
  });
});

describe('formatBalance', () => {
  it('formats RUB amounts in ru-RU with the currency sign', () => {
    const s = formatBalance(124500, 'RUB');
    expect(s).toContain('₽');
    expect(s.replace(/ |\s/g, '')).toContain('124500');
  });

  it('falls back to RUB when currency is missing', () => {
    expect(formatBalance(0)).toContain('₽');
  });

  it('treats non-numeric input as zero', () => {
    expect(formatBalance(undefined as unknown as number, 'RUB')).toContain('0');
  });
});
