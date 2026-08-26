import { describe, it, expect } from 'vitest';
import { resolveDefaultTaxRateId } from './defaultTaxRate';
import { TaxRegime } from './constants';

/**
 * Н2 карты v22 — продукт сам подставляет ставку НДС по режиму организации.
 */
const rates = [
  { id: 1, code: 'VAT_20', active: true },
  { id: 2, code: 'VAT_10', active: true },
  { id: 3, code: 'VAT_0', active: true },
  { id: 4, code: 'VAT_NONE', active: true },
];

describe('ставка НДС по налоговому режиму', () => {
  it('на упрощёнке «Доходы» подставляет «Без НДС»', () => {
    expect(resolveDefaultTaxRateId(rates, TaxRegime.USN_INCOME)).toBe('4');
  });

  it('на упрощёнке «Доходы минус расходы» — тоже «Без НДС»', () => {
    expect(resolveDefaultTaxRateId(rates, TaxRegime.USN_INCOME_EXPENSE)).toBe(
      '4',
    );
  });

  it('на патенте и АУСН — «Без НДС»', () => {
    expect(resolveDefaultTaxRateId(rates, TaxRegime.PATENT)).toBe('4');
    expect(resolveDefaultTaxRateId(rates, TaxRegime.AUSN)).toBe('4');
  });

  it('на общей системе — 20 %', () => {
    expect(resolveDefaultTaxRateId(rates, TaxRegime.OSNO)).toBe('1');
  });

  it('режим не задан — ничего не подставляем, человек выбирает сам', () => {
    // null, а не отсутствие аргумента: так приходит пустое поле организации.
    expect(resolveDefaultTaxRateId(rates, null)).toBe('');
    expect(resolveDefaultTaxRateId(rates, '')).toBe('');
  });

  it('незнакомый режим ничего не ломает', () => {
    expect(resolveDefaultTaxRateId(rates, 'ЧТО-ТО СВОЁ')).toBe('');
  });

  it('справочник ставок ещё не загрузился — пусто, а не ошибка', () => {
    expect(resolveDefaultTaxRateId(undefined, TaxRegime.OSNO)).toBe('');
    expect(resolveDefaultTaxRateId([], TaxRegime.OSNO)).toBe('');
  });

  it('выключенную ставку не подставляем', () => {
    const withDisabled = [{ id: 9, code: 'VAT_NONE', active: false }];

    expect(resolveDefaultTaxRateId(withDisabled, TaxRegime.USN_INCOME)).toBe(
      '',
    );
  });

  it('нужной ставки нет в справочнике — оставляем выбор человеку', () => {
    const onlyTwenty = [{ id: 1, code: 'VAT_20', active: true }];

    expect(resolveDefaultTaxRateId(onlyTwenty, TaxRegime.USN_INCOME)).toBe('');
  });
});
