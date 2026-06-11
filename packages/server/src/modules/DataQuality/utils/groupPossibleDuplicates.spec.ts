// © 2026 Bigfin
import { groupPossibleDuplicates } from './groupPossibleDuplicates';

const row = (overrides: Partial<any> = {}) => ({
  id: 1,
  date: '2026-06-01',
  accountId: 10,
  credit: 0,
  debit: 1000,
  referenceType: 'Expense',
  referenceId: 1,
  transactionNumber: null,
  referenceNumber: null,
  ...overrides,
});

describe('groupPossibleDuplicates', () => {
  it('группа из 2 разных источников — ловится', () => {
    const { groups, totalGroups } = groupPossibleDuplicates([
      row({ id: 1, referenceType: 'Expense', referenceId: 1 }),
      row({ id: 2, referenceType: 'Expense', referenceId: 2 }),
    ]);
    expect(totalGroups).toBe(1);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      date: '2026-06-01',
      accountId: 10,
      amount: 1000,
      side: 'debit',
    });
    expect(groups[0].entries.map((e) => e.transactionId)).toEqual([1, 2]);
  });

  it('две ноги одной проводки (один источник) — не дубль', () => {
    const { groups, totalGroups } = groupPossibleDuplicates([
      row({ id: 1, debit: 1000, credit: 0 }),
      row({ id: 2, debit: 0, credit: 1000, accountId: 10 }),
      // даже одинаковая нога из одного источника — не дубль
      row({ id: 3, debit: 1000, credit: 0 }),
    ]);
    expect(totalGroups).toBe(0);
    expect(groups).toEqual([]);
  });

  it('разные источники одного типа различаются по referenceId', () => {
    const { totalGroups } = groupPossibleDuplicates([
      row({ id: 1, referenceType: 'Bill', referenceId: 5 }),
      row({ id: 2, referenceType: 'Bill', referenceId: 5 }),
    ]);
    expect(totalGroups).toBe(0); // один и тот же документ
  });

  it('нулевые суммы исключены', () => {
    const { totalGroups } = groupPossibleDuplicates([
      row({ id: 1, credit: 0, debit: 0, referenceId: 1 }),
      row({ id: 2, credit: 0, debit: 0, referenceId: 2 }),
    ]);
    expect(totalGroups).toBe(0);
  });

  it('разные стороны (credit vs debit) не группируются вместе', () => {
    const { totalGroups } = groupPossibleDuplicates([
      row({ id: 1, credit: 1000, debit: 0, referenceId: 1 }),
      row({ id: 2, credit: 0, debit: 1000, referenceId: 2 }),
    ]);
    expect(totalGroups).toBe(0);
  });

  it('сортировка по сумме убыв. и лимит; totalGroups — до лимита', () => {
    const rows = [
      // группа на 500
      row({ id: 1, debit: 500, referenceId: 1 }),
      row({ id: 2, debit: 500, referenceId: 2 }),
      // группа на 9000
      row({ id: 3, debit: 9000, referenceId: 3 }),
      row({ id: 4, debit: 9000, referenceId: 4 }),
      // группа на 700
      row({ id: 5, debit: 700, referenceId: 5 }),
      row({ id: 6, debit: 700, referenceId: 6 }),
    ];
    const { groups, totalGroups } = groupPossibleDuplicates(rows, 2);
    expect(totalGroups).toBe(3);
    expect(groups.map((g) => g.amount)).toEqual([9000, 700]);
  });

  it('NaN-safe: мусорные суммы не валят группировку', () => {
    const { totalGroups } = groupPossibleDuplicates([
      row({ id: 1, debit: 'x' as any, credit: undefined as any }),
      row({ id: 2, debit: 'x' as any, credit: undefined as any, referenceId: 2 }),
    ]);
    expect(totalGroups).toBe(0); // NaN → 0 → нулевые исключены
  });

  it('Date нормализуется к YYYY-MM-DD без сдвига дня', () => {
    const { groups } = groupPossibleDuplicates([
      row({ id: 1, date: new Date(2026, 5, 1), referenceId: 1 }),
      row({ id: 2, date: '2026-06-01T00:00:00.000Z', referenceId: 2 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].date).toBe('2026-06-01');
  });
});
