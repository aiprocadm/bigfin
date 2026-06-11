// © 2026 Bigfin
import { GetDividendsSummaryService } from './GetDividendsSummary.service';

// Thenable query stub (паттерн GetDebtsOverview.service.spec):
// awaitable напрямую И чейнится (.whereIn/.modify/.onBuild).
const makeQuery = (rows: any): any => {
  const q: any = {
    whereIn: () => q,
    modify: () => Promise.resolve(rows),
    onBuild: () => Promise.resolve(rows),
    then: (resolve: any, reject: any) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return q;
};

describe('GetDividendsSummaryService', () => {
  it('собирает сводку: прибыль − выведено − кредиторка', async () => {
    const accountModel = () => ({
      query: () =>
        makeQuery([
          { id: 1, accountType: 'income' },
          { id: 2, accountType: 'expense' },
        ]),
    });
    const accountTransactionModel = () => ({
      query: () =>
        makeQuery([
          { accountId: 1, credit: 1000, debit: 0 },
          { accountId: 2, credit: 0, debit: 400 },
        ]),
    });
    const payoutModel = () => ({
      query: () => makeQuery([{ amount: 100 }, { amount: 50 }]),
    });
    // billModel: каждый query() — отдельный набор (overdue, затем current).
    let billCall = 0;
    const billModel = () => ({
      query: () =>
        makeQuery(
          billCall++ === 0
            ? [{ dueAmount: 70, exchangeRate: 1 }]
            : [{ dueAmount: 30, exchangeRate: 1 }],
        ),
    });

    const service = new GetDividendsSummaryService(
      accountModel as any,
      accountTransactionModel as any,
      payoutModel as any,
      billModel as any,
    );
    const res = await service.getSummary();

    expect(res.netProfit).toBe(600);
    expect(res.totalPaidOut).toBe(150);
    expect(res.available).toBe(450);
    expect(res.unpaidBills).toBe(100);
    expect(res.safe).toBe(350);
  });

  it('нет P&L-счетов → прибыль 0, сводка не падает', async () => {
    const accountModel = () => ({ query: () => makeQuery([]) });
    const accountTransactionModel = () => ({
      query: () => {
        throw new Error('не должен вызываться без P&L-счетов');
      },
    });
    const payoutModel = () => ({ query: () => makeQuery([]) });
    const billModel = () => ({ query: () => makeQuery([]) });

    const service = new GetDividendsSummaryService(
      accountModel as any,
      accountTransactionModel as any,
      payoutModel as any,
      billModel as any,
    );
    const res = await service.getSummary();

    expect(res).toEqual({
      netProfit: 0,
      totalPaidOut: 0,
      available: 0,
      unpaidBills: 0,
      safe: 0,
    });
  });
});
