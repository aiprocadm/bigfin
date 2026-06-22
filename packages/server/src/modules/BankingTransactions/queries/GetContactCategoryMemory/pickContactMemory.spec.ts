import { pickContactMemory } from './pickContactMemory';

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
