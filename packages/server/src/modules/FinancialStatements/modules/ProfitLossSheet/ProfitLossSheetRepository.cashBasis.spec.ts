// © 2026 Bigfin
import { ProfitLossSheetRepository } from './ProfitLossSheetRepository';

// 100 = расчётный счёт (bank), 200 = дебиторка, 300 = доход, 400 = расход.
const accounts = [
  { id: 100, accountType: 'bank' },
  { id: 200, accountType: 'accounts-receivable' },
  { id: 300, accountType: 'income' },
  { id: 400, accountType: 'expense' },
];

// Проводки периода: кассовый расход + неоплаченный счёт покупателю.
const periodLegs = [
  // Кассовый расход (деньги ушли с банка).
  { referenceType: 'CashflowTransaction', referenceId: 1, accountId: 100, transactionType: 'OtherExpense', credit: 500, debit: 0, date: '2026-01-12' },
  { referenceType: 'CashflowTransaction', referenceId: 1, accountId: 400, transactionType: 'OtherExpense', credit: 0, debit: 500, date: '2026-01-12' },
  // Неоплаченный счёт (только начисление — в кассовый режим не попадает).
  { referenceType: 'SaleInvoice', referenceId: 2, accountId: 200, transactionType: null, credit: 0, debit: 1000, date: '2026-01-15' },
  { referenceType: 'SaleInvoice', referenceId: 2, accountId: 300, transactionType: null, credit: 1000, debit: 0, date: '2026-01-15' },
];

// Результат SQL-агрегации режима начисления (как сегодня) — включает доход
// неоплаченного счёта.
const accrualSqlRows = [
  { accountId: 300, credit: 1000, debit: 0, account: accounts[2] },
  { accountId: 400, credit: 0, debit: 500, account: accounts[3] },
];

const buildRepository = (cashBasisActive: boolean) => {
  const repository = new ProfitLossSheetRepository() as any;

  repository.accounts = accounts;
  repository.query = { query: { branchesIds: [] } };
  repository.isCashBasisActive = cashBasisActive;

  const builder = {
    sum: jest.fn(),
    groupBy: jest.fn(),
    select: jest.fn(),
    modify: jest.fn(),
    withGraphFetched: jest.fn(),
  };
  repository.accountTransactionModel = () => ({
    query: () => ({
      onBuild: (callback: (query: any) => void) => {
        callback(builder);
        // Кассовый путь запрашивает сырые проводки, начисление — SQL-агрегацию.
        return Promise.resolve(cashBasisActive ? periodLegs : accrualSqlRows);
      },
    }),
  });
  return { repository, builder };
};

describe('ProfitLossSheetRepository — cash/accrual basis', () => {
  it('кассовый режим: считает только кассовые источники, неоплаченный счёт исключён', async () => {
    const { repository } = buildRepository(true);
    const rows = await repository.accountsTotal('2026-01-01', '2026-01-31');

    // Только расход 500 (дошли деньги); дохода 1000 от неоплаченного счёта нет.
    const accountsIds = rows.map((row: any) => row.accountId);
    expect(accountsIds).toContain(100);
    expect(accountsIds).toContain(400);
    expect(accountsIds).not.toContain(300);
    expect(accountsIds).not.toContain(200);

    const expenseRow = rows.find((row: any) => row.accountId === 400);
    expect(expenseRow.debit).toBe(500);
    // Счёт прикреплён — как withGraphFetched('account') в SQL-пути.
    expect(expenseRow.account).toEqual(accounts[3]);
  });

  it('кассовый режим: периоды группируются по месяцу как SQL DATE_FORMAT', async () => {
    const { repository } = buildRepository(true);
    const rows = await repository.accountsDatePeriods(
      '2026-01-01',
      '2026-01-31',
      'month',
    );
    const expenseRow = rows.find((row: any) => row.accountId === 400);
    expect(expenseRow.date).toBe('2026-01');
    expect(expenseRow.debit).toBe(500);
  });

  it('режим начисления: SQL-агрегация остаётся как сегодня и включает неоплаченный счёт', async () => {
    const { repository, builder } = buildRepository(false);
    const rows = await repository.accountsTotal('2026-01-01', '2026-01-31');

    // Возвращается результат SQL-агрегации без пост-фильтрации.
    expect(rows).toBe(accrualSqlRows);
    expect(rows.find((row: any) => row.accountId === 300).credit).toBe(1000);
    // SQL-агрегация построена как раньше.
    expect(builder.sum).toHaveBeenCalledWith('credit as credit');
    expect(builder.sum).toHaveBeenCalledWith('debit as debit');
    expect(builder.groupBy).toHaveBeenCalledWith('accountId');
    expect(builder.withGraphFetched).toHaveBeenCalledWith('account');
  });
});
