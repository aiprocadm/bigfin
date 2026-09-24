// © 2026 Bigfin
import {
  ACCOUNT_TAX_REGIME_OPTIONS,
  accountSupportsTaxRegime,
  taxRegimeForRequest,
} from './accountTaxRegimes';

/**
 * FT-070 ТЗ-3: налоговый режим счёта в форме.
 *
 * Сервер держит домен из девяти режимов; расхождение списков означало бы,
 * что витрина предлагает режим, который сервер отвергнет, или прячет тот,
 * что уже записан у счёта.
 */
describe('налоговый режим счёта', () => {
  it('список совпадает с доменом сервера', () => {
    expect(ACCOUNT_TAX_REGIME_OPTIONS.map((option) => option.value)).toEqual([
      'USN_INCOME',
      'USN_INCOME_EXPENSE',
      'USN_VAT_5',
      'USN_VAT_7',
      'USN_VAT_20',
      'OSNO',
      'AUSN',
      'PSN',
      'NPD',
    ]);
  });

  it('режим выбирается только у кассы и банка', () => {
    expect(accountSupportsTaxRegime('bank')).toBe(true);
    expect(accountSupportsTaxRegime('cash')).toBe(true);
    expect(accountSupportsTaxRegime('income')).toBe(false);
    expect(accountSupportsTaxRegime(undefined)).toBe(false);
  });

  it('«как у организации» уходит на сервер пустым значением', () => {
    expect(taxRegimeForRequest('bank', '')).toBeNull();
    expect(taxRegimeForRequest('bank', 'NPD')).toBe('NPD');
  });

  it('у не денежного счёта поле не отправляется вовсе', () => {
    expect(taxRegimeForRequest('expense', 'NPD')).toBeUndefined();
  });
});
