import { cashSettledReferenceKeys } from './cashSettledReferenceKeys';

const isCash = (id: number) => id === 100; // 100 = денежный счёт

describe('cashSettledReferenceKeys', () => {
  it('keeps references that touched a cash account', () => {
    const legs = [
      {
        referenceType: 'CashflowTransaction',
        referenceId: 1,
        accountId: 100,
        transactionType: 'OtherExpense',
      },
      {
        referenceType: 'CashflowTransaction',
        referenceId: 1,
        accountId: 500,
        transactionType: 'OtherExpense',
      },
    ];
    expect(cashSettledReferenceKeys(legs, isCash)).toEqual(
      new Set(['CashflowTransaction:1']),
    );
  });

  it('excludes internal transfers between own accounts', () => {
    const legs = [
      {
        referenceType: 'CashflowTransaction',
        referenceId: 2,
        accountId: 100,
        transactionType: 'TransferToAccount',
      },
      {
        referenceType: 'CashflowTransaction',
        referenceId: 2,
        accountId: 101,
        transactionType: 'TransferFromAccount',
      },
    ];
    expect(cashSettledReferenceKeys(legs, isCash)).toEqual(new Set());
  });

  it('ignores references that never touched cash (accrual-only)', () => {
    const legs = [
      {
        referenceType: 'Bill',
        referenceId: 3,
        accountId: 500,
        transactionType: null,
      },
      {
        referenceType: 'Bill',
        referenceId: 3,
        accountId: 600,
        transactionType: null,
      },
    ];
    expect(cashSettledReferenceKeys(legs, isCash)).toEqual(new Set());
  });
});
