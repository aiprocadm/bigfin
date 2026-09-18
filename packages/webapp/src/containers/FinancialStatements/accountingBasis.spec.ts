// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  ACCOUNTING_BASIS_OPTIONS,
  accountingBasisHintKey,
  resolveAccountingBasis,
} from './accountingBasis';

/**
 * Случаи ниже — зеркало серверной спеки
 * `packages/server/src/modules/FinancialStatements/modules/ProfitLossSheet/utils.spec.ts`.
 * Если правило на сервере поменяют, а здесь нет — эти проверки покраснеют,
 * и расхождение «подпись говорит одно, движок считает другое» не доедет до
 * пользователя.
 */
describe('resolveAccountingBasis — какой метод показан на самом деле', () => {
  it('флаг accrual_pnl выключен и метод не задан → по начислению (легаси)', () => {
    expect(resolveAccountingBasis(undefined, false)).toBe('accrual');
  });

  it('флаг включён и метод не задан → кассовый', () => {
    expect(resolveAccountingBasis(undefined, true)).toBe('cash');
  });

  it('явный метод из адреса важнее умолчания', () => {
    expect(resolveAccountingBasis('accrual', true)).toBe('accrual');
    expect(resolveAccountingBasis('cash', false)).toBe('cash');
  });

  it('мусор вместо метода не показывается как метод', () => {
    // Адрес правит человек руками: ?basis=касса не должно рисовать
    // пустую кнопку или подпись «касса» под таблицей с деньгами.
    expect(resolveAccountingBasis('касса', true)).toBe('cash');
    expect(resolveAccountingBasis(null, false)).toBe('accrual');
    expect(resolveAccountingBasis(42, true)).toBe('cash');
  });
});

describe('ACCOUNTING_BASIS_OPTIONS — состав переключателя', () => {
  it('ровно два метода, кассовый первым', () => {
    expect(ACCOUNTING_BASIS_OPTIONS.map((o) => o.value)).toEqual([
      'cash',
      'accrual',
    ]);
  });

  it('у каждого метода есть и подпись, и пояснение', () => {
    // Пункт ТЗ требует пояснение «в одну строку человеческим языком»:
    // переключатель без него — две кнопки, между которыми надо гадать.
    ACCOUNTING_BASIS_OPTIONS.forEach((option) => {
      expect(option.labelKey).toBeTruthy();
      expect(option.hintKey).toBeTruthy();
    });
  });

  it('пояснения у методов разные', () => {
    const [cash, accrual] = ACCOUNTING_BASIS_OPTIONS;
    expect(cash.hintKey).not.toBe(accrual.hintKey);
  });
});

describe('accountingBasisHintKey', () => {
  it('отдаёт пояснение выбранного метода', () => {
    expect(accountingBasisHintKey('cash')).toBe('reports.basis.cash_hint');
    expect(accountingBasisHintKey('accrual')).toBe(
      'reports.basis.accrual_hint',
    );
  });
});
