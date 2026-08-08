// © 2026 Bigfin
import { describe, expect, it } from 'vitest';
import { DRAWERS } from '@/constants/drawers';
import { resolveReferenceDrawer } from './drawerUtils';

describe('resolveReferenceDrawer', () => {
  it('банковская операция открывает свой drawer (приёмка ㉗: кейс отсутствовал)', () => {
    const target = resolveReferenceDrawer('CashflowTransaction', 7);
    expect(target).toEqual({
      name: DRAWERS.CASHFLOW_TRNASACTION_DETAILS,
      payload: { referenceId: 7 },
    });
  });

  it('расход открывает drawer расхода с ключом expenseId', () => {
    const target = resolveReferenceDrawer('Expense', 42);
    expect(target).toEqual({
      name: DRAWERS.EXPENSE_DETAILS,
      payload: { expenseId: 42 },
    });
  });

  it('ручная проводка: Journal и алиас ManualJournal — один drawer', () => {
    expect(resolveReferenceDrawer('Journal', 1)?.name).toBe(
      DRAWERS.JOURNAL_DETAILS,
    );
    expect(resolveReferenceDrawer('ManualJournal', 1)?.name).toBe(
      DRAWERS.JOURNAL_DETAILS,
    );
  });

  it('неизвестный тип и пустые аргументы → null (строка некликабельна)', () => {
    expect(resolveReferenceDrawer('FixedAssetDepreciation', 1)).toBeNull();
    expect(resolveReferenceDrawer(null, 1)).toBeNull();
    expect(resolveReferenceDrawer('Expense', null)).toBeNull();
  });
});
