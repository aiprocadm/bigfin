// © 2026 Bigfin
import { computePlCashflowComparison } from './computePlCashflowComparison';

const accounts = [
  { id: 1, accountType: 'income' },
  { id: 2, accountType: 'other-income' },
  { id: 3, accountType: 'expense' },
  { id: 4, accountType: 'cost-of-goods-sold' },
  { id: 5, accountType: 'other-expense' },
  { id: 6, accountType: 'bank' },
  { id: 7, accountType: 'cash' },
  { id: 8, accountType: 'accounts-receivable' }, // не участвует
];

describe('computePlCashflowComparison', () => {
  it('помесячная сборка: plNet/cashNet/diff', () => {
    const { months, totals } = computePlCashflowComparison(
      [
        // июнь: доход 1000 (credit-normal), расход 400, в банк пришло 800
        { month: '2026-06', accountId: 1, credit: 1000, debit: 0 },
        { month: '2026-06', accountId: 3, credit: 0, debit: 400 },
        { month: '2026-06', accountId: 6, credit: 0, debit: 800 },
        // июль: только касса — ушло 300
        { month: '2026-07', accountId: 7, credit: 300, debit: 0 },
      ],
      accounts,
    );
    expect(months).toEqual([
      {
        month: '2026-06',
        plIncome: 1000,
        plExpense: 400,
        plNet: 600,
        cashIn: 800,
        cashOut: 0,
        cashNet: 800,
        diff: -200,
      },
      {
        month: '2026-07',
        plIncome: 0,
        plExpense: 0,
        plNet: 0,
        cashIn: 0,
        cashOut: 300,
        cashNet: -300,
        diff: 300,
      },
    ]);
    expect(totals).toEqual({ plNet: 600, cashNet: 500, diff: 100 });
  });

  it('знаки по нормали: income credit−debit, expense debit−credit', () => {
    const { months } = computePlCashflowComparison(
      [
        // возврат дохода (debit по credit-normal счёту) уменьшает plIncome
        { month: '2026-06', accountId: 2, credit: 1000, debit: 200 },
        // сторно расхода (credit по debit-normal) уменьшает plExpense
        { month: '2026-06', accountId: 4, credit: 100, debit: 500 },
        { month: '2026-06', accountId: 5, credit: 0, debit: 50 },
      ],
      accounts,
    );
    expect(months[0].plIncome).toBe(800);
    expect(months[0].plExpense).toBe(450);
    expect(months[0].plNet).toBe(350);
  });

  it('счета вне P&L/денег и неизвестные счета игнорируются', () => {
    const { months } = computePlCashflowComparison(
      [
        { month: '2026-06', accountId: 8, credit: 0, debit: 7777 },
        { month: '2026-06', accountId: 999, credit: 0, debit: 8888 },
        { month: '2026-06', accountId: 1, credit: 100, debit: 0 },
      ],
      accounts,
    );
    expect(months).toEqual([
      {
        month: '2026-06',
        plIncome: 100,
        plExpense: 0,
        plNet: 100,
        cashIn: 0,
        cashOut: 0,
        cashNet: 0,
        diff: 100,
      },
    ]);
  });

  it('NaN-safe: мусорные суммы считаются нулями', () => {
    const { months, totals } = computePlCashflowComparison(
      [{ month: '2026-06', accountId: 1, credit: 'x' as any, debit: null as any }],
      accounts,
    );
    expect(months[0].plIncome).toBe(0);
    expect(totals).toEqual({ plNet: 0, cashNet: 0, diff: 0 });
  });

  it('месяцы сортируются по возрастанию', () => {
    const { months } = computePlCashflowComparison(
      [
        { month: '2026-09', accountId: 1, credit: 1, debit: 0 },
        { month: '2026-02', accountId: 1, credit: 1, debit: 0 },
      ],
      accounts,
    );
    expect(months.map((m) => m.month)).toEqual(['2026-02', '2026-09']);
  });

  it('пустой ввод → пустые месяцы и нулевые totals', () => {
    expect(computePlCashflowComparison([], [])).toEqual({
      months: [],
      totals: { plNet: 0, cashNet: 0, diff: 0 },
    });
  });
});
