// © 2026 Bigfin
import {
  buildUnmappedAccountsReport,
  filterUnmappedPlAccounts,
} from './unmappedAccounts';

const account = (overrides: Partial<any> = {}) => ({
  id: 1,
  name: 'Расходы на рекламу',
  code: '6001',
  accountType: 'expense',
  accountNormal: 'debit',
  ...overrides,
});

const tx = (overrides: Partial<any> = {}) => ({
  id: 1,
  accountId: 1,
  date: '2026-06-01',
  credit: 0,
  debit: 1000,
  referenceType: 'Expense',
  referenceId: 1,
  transactionNumber: null,
  referenceNumber: null,
  ...overrides,
});

describe('filterUnmappedPlAccounts', () => {
  it('оставляет только P&L-типы без привязки к статье', () => {
    const accounts = [
      account({ id: 1, accountType: 'income', accountNormal: 'credit' }),
      account({ id: 2, accountType: 'expense' }),
      account({ id: 3, accountType: 'cost-of-goods-sold' }),
      account({ id: 4, accountType: 'other-income', accountNormal: 'credit' }),
      account({ id: 5, accountType: 'other-expense' }),
      account({ id: 6, accountType: 'bank' }), // деньги — статья не нужна
      account({ id: 7, accountType: 'accounts-receivable' }), // баланс
    ];
    const result = filterUnmappedPlAccounts(accounts, [2, 4]);
    expect(result.map((a) => a.id)).toEqual([1, 3, 5]);
  });
});

describe('buildUnmappedAccountsReport', () => {
  it('счёт без операций за период не попадает в отчёт', () => {
    const { accounts, totalCount } = buildUnmappedAccountsReport(
      [account({ id: 1 }), account({ id: 2 })],
      [tx({ accountId: 1 })],
    );
    expect(accounts).toHaveLength(1);
    expect(accounts[0].accountId).toBe(1);
    expect(totalCount).toBe(1);
  });

  it('totalAmount — нетто по нормали счёта', () => {
    // debit-normal: debit − credit
    const debitReport = buildUnmappedAccountsReport(
      [account({ id: 1, accountNormal: 'debit' })],
      [tx({ id: 1, debit: 1000, credit: 0 }), tx({ id: 2, debit: 0, credit: 200 })],
    );
    expect(debitReport.accounts[0].totalAmount).toBe(800);

    // credit-normal: credit − debit
    const creditReport = buildUnmappedAccountsReport(
      [account({ id: 1, accountType: 'income', accountNormal: 'credit' })],
      [tx({ id: 1, debit: 0, credit: 1000 }), tx({ id: 2, debit: 300, credit: 0 })],
    );
    expect(creditReport.accounts[0].totalAmount).toBe(700);
  });

  it('side: in — нога совпадает с нормалью, out — обратная', () => {
    const { accounts } = buildUnmappedAccountsReport(
      [account({ id: 1, accountNormal: 'debit' })],
      [
        tx({ id: 1, debit: 1000, credit: 0 }), // расход растёт → in
        tx({ id: 2, debit: 0, credit: 200 }), // сторно → out
      ],
    );
    const byId = new Map(accounts[0].operations.map((o) => [o.transactionId, o]));
    expect(byId.get(1)).toMatchObject({ amount: 1000, side: 'in' });
    expect(byId.get(2)).toMatchObject({ amount: 200, side: 'out' });
  });

  it('operations: дата убыв., обрезка по лимиту, operationsCount без обрезки', () => {
    const rows = [
      tx({ id: 1, date: '2026-06-01', debit: 10 }),
      tx({ id: 2, date: '2026-06-03', debit: 20 }),
      tx({ id: 3, date: '2026-06-02', debit: 30 }),
    ];
    const { accounts, totalCount } = buildUnmappedAccountsReport(
      [account({ id: 1 })],
      rows,
      2,
    );
    expect(accounts[0].operationsCount).toBe(3);
    expect(totalCount).toBe(3);
    expect(accounts[0].operations.map((o) => o.transactionId)).toEqual([2, 3]);
  });

  it('счета сортируются по |totalAmount| убыв.', () => {
    const { accounts } = buildUnmappedAccountsReport(
      [account({ id: 1 }), account({ id: 2, name: 'Прочие расходы' })],
      [
        tx({ id: 1, accountId: 1, debit: 100 }),
        tx({ id: 2, accountId: 2, debit: 9000 }),
      ],
    );
    expect(accounts.map((a) => a.accountId)).toEqual([2, 1]);
  });

  it('NaN-safe: мусорные суммы не валят отчёт', () => {
    const { accounts } = buildUnmappedAccountsReport(
      [account({ id: 1 })],
      [tx({ id: 1, debit: 'x' as any, credit: undefined as any })],
    );
    expect(accounts[0].totalAmount).toBe(0);
    expect(accounts[0].operations[0]).toMatchObject({ amount: 0, side: 'out' });
  });
});
