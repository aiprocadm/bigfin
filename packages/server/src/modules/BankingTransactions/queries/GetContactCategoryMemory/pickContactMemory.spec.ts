import { pickContactMemory, toFormTransactionType } from './pickContactMemory';

describe('pickContactMemory', () => {
  it('возвращает null для пустого списка', () => {
    expect(pickContactMemory([])).toBeNull();
  });

  it('берёт первую строку (последнее подтверждение) с непустой статьёй', () => {
    const rows = [
      { creditAccountId: 1001, transactionType: 'other_expense' },
      { creditAccountId: 2002, transactionType: 'other_income' },
    ];
    expect(pickContactMemory(rows)).toEqual({
      creditAccountId: 1001,
      transactionType: 'other_expense',
    });
  });

  it('пропускает строки без статьи (null creditAccountId)', () => {
    const rows = [
      { creditAccountId: null, transactionType: 'other_expense' },
      { creditAccountId: 3003, transactionType: 'other_income' },
    ];
    expect(pickContactMemory(rows)).toEqual({
      creditAccountId: 3003,
      transactionType: 'other_income',
    });
  });

  it('возвращает null, если ни в одной строке нет статьи', () => {
    const rows = [
      { creditAccountId: null, transactionType: 'other_expense' },
      { creditAccountId: undefined, transactionType: 'other_income' },
    ];
    expect(pickContactMemory(rows)).toBeNull();
  });

  it('сохраняет transactionType равным null, если он не задан', () => {
    const rows = [{ creditAccountId: 4004, transactionType: null }];
    expect(pickContactMemory(rows)).toEqual({
      creditAccountId: 4004,
      transactionType: null,
    });
  });
});

describe('toFormTransactionType', () => {
  it('переводит PascalCase из БД в snake_case формы', () => {
    expect(toFormTransactionType('OtherIncome')).toBe('other_income');
    expect(toFormTransactionType('OtherExpense')).toBe('other_expense');
    expect(toFormTransactionType('OwnerDrawing')).toBe('owner_drawing');
    expect(toFormTransactionType('TransferFromAccount')).toBe(
      'transfer_from_account',
    );
  });

  it('возвращает null для пустого значения', () => {
    expect(toFormTransactionType(null)).toBeNull();
    expect(toFormTransactionType(undefined)).toBeNull();
    expect(toFormTransactionType('')).toBeNull();
  });
});
