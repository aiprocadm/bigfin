// © 2026 Bigfin
import { BankTransactionGL } from './BankTransactionGL';

/**
 * Проводки денежной операции с направлением и с частями (FT-030, FT-031
 * ТЗ-3): сверка с банком видит одну сумму, отчёты — части.
 */
describe('проводки денежной операции', () => {
  const expense = (extra: Record<string, any> = {}) =>
    ({
      id: 7,
      date: '2026-01-10',
      currencyCode: 'RUB',
      exchangeRate: 1,
      transactionType: 'OtherExpense',
      isCashDebit: false,
      isCashCredit: true,
      localAmount: 100000,
      cashflowAccountId: 1000,
      creditAccountId: 1021,
      cashflowAccount: { accountNormal: 'debit' },
      creditAccount: { accountNormal: 'debit' },
      ...extra,
    }) as any;

  const sum = (entries: any[], side: 'debit' | 'credit') =>
    Math.round(entries.reduce((s, e) => s + Number(e[side] || 0), 0) * 100) / 100;

  it('без частей — две проводки, направление на обеих', () => {
    const { entries } = new BankTransactionGL(expense({ projectId: 3 })).getCashflowLedger();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.projectId)).toEqual([3, 3]);
    expect(entries[1]).toMatchObject({ accountId: 1021, debit: 100000, credit: 0 });
  });

  it('части 70/30: деньги одной проводкой, «куда» — по частям со своими направлениями', () => {
    const { entries } = new BankTransactionGL(expense(), [
      { accountId: 1021, projectId: 1, amount: 70000 },
      { accountId: 1022, projectId: 2, amount: 30000 },
    ]).getCashflowLedger();

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ accountId: 1000, credit: 100000, projectId: null });
    expect(entries.slice(1).map((e) => [e.accountId, e.debit, e.projectId])).toEqual([
      [1021, 70000, 1],
      [1022, 30000, 2],
    ]);
    expect(sum(entries, 'debit')).toBe(sum(entries, 'credit'));
  });

  it('при курсе ≠ 1 части в валюте учёта сходятся с деньгами до копейки', () => {
    const { entries } = new BankTransactionGL(
      expense({ exchangeRate: 91.3713, localAmount: 101.01 * 91.3713 }),
      [
        { accountId: 1021, amount: 33.67 },
        { accountId: 1022, amount: 33.67 },
        { accountId: 1023, amount: 33.67 },
      ],
    ).getCashflowLedger();
    const local = Math.round(101.01 * 91.3713 * 100) / 100;
    expect(sum(entries.slice(1), 'debit')).toBe(local);
  });

  it('поступление с частями: проводки «откуда» по кредиту', () => {
    const { entries } = new BankTransactionGL(
      expense({ transactionType: 'OtherIncome', isCashDebit: true, isCashCredit: false }),
      [
        { accountId: 1026, amount: 60000 },
        { accountId: 1027, amount: 40000 },
      ],
    ).getCashflowLedger();
    expect(entries[0]).toMatchObject({ debit: 100000 });
    expect(entries.slice(1).map((e) => e.credit)).toEqual([60000, 40000]);
  });
});
