import {
  INTERFACE_MODE,
  isAccountantOnlyHidden,
  isAccountantOnlyPath,
} from './interfaceMode';

describe('isAccountantOnlyHidden', () => {
  it('флаг выключен → не прячем', () => {
    expect(isAccountantOnlyHidden(INTERFACE_MODE.Business, false)).toBe(false);
  });
  it('флаг включён + режим business → прячем', () => {
    expect(isAccountantOnlyHidden(INTERFACE_MODE.Business, true)).toBe(true);
  });
  it('флаг включён + режим accountant → не прячем', () => {
    expect(isAccountantOnlyHidden(INTERFACE_MODE.Accountant, true)).toBe(false);
  });
});

describe('isAccountantOnlyPath', () => {
  it.each([
    '/manual-journals',
    '/manual-journals/import',
    '/manual-journals/5/edit',
    '/make-journal-entry',
    '/transactions-locking',
    '/financial-reports/general-ledger',
    '/financial-reports/trial-balance-sheet',
    '/financial-reports/journal-sheet',
  ])('accountant-only: %s', (p) => {
    expect(isAccountantOnlyPath(p)).toBe(true);
  });

  it.each([
    '/',
    '/invoices',
    '/financial-reports/balance-sheet',
    '/accounts',
    '/tax-rates',
  ])('обычный: %s', (p) => {
    expect(isAccountantOnlyPath(p)).toBe(false);
  });
});
