import { describe, it, expect } from 'vitest';
import { categorizeTransactionSchema } from './categorizeTransaction.schema';
import { resolveSubtypeConfig } from './categorizeTransaction.config';

const valid = {
  amount: '60000',
  exchangeRate: '1',
  transactionType: 'other_expense',
  date: '2026-06-11',
  debitAccountId: 1001,
  creditAccountId: 2002,
  referenceNo: '',
  description: '',
  branchId: null,
  contactId: null,
};

describe('categorizeTransactionSchema', () => {
  it('принимает валидные значения', () => {
    expect(categorizeTransactionSchema.safeParse(valid).success).toBe(true);
  });
  it('требует transactionType', () => {
    expect(categorizeTransactionSchema.safeParse({ ...valid, transactionType: '' }).success).toBe(false);
  });
  it('требует creditAccountId', () => {
    expect(categorizeTransactionSchema.safeParse({ ...valid, creditAccountId: '' }).success).toBe(false);
  });
  it('требует дату', () => {
    expect(categorizeTransactionSchema.safeParse({ ...valid, date: '' }).success).toBe(false);
  });
  it('допускает пустые referenceNo/description и null контрагента', () => {
    expect(categorizeTransactionSchema.safeParse({ ...valid, referenceNo: '', description: '', contactId: null }).success).toBe(true);
  });
});

describe('resolveSubtypeConfig', () => {
  it('для расхода даёт счёт расхода с фильтром expense', () => {
    const c = resolveSubtypeConfig('other_expense')!;
    expect(c.creditFilterRootTypes).toEqual(['expense']);
    expect(c.creditAccountLabelKey).toBe('expense_account');
  });
  it('для прочего дохода — фильтр income', () => {
    expect(resolveSubtypeConfig('other_income')!.creditFilterRootTypes).toEqual(['income']);
  });
  it('для перевода — фильтр asset', () => {
    expect(resolveSubtypeConfig('transfer_to_account')!.creditFilterRootTypes).toEqual(['asset']);
  });
  it('неизвестный тип → null', () => {
    expect(resolveSubtypeConfig('nope')).toBeNull();
  });
});
