import { ArticlesCashflowRollupService } from './ArticlesCashflowRollup.service';

describe('ArticlesCashflowRollupService', () => {
  it('rolls up only cash-settled turnover into articles', async () => {
    // Статьи: 1 «Аренда» (expense). Карта: счёт 500 → статья 1.
    const articleModel = () => ({
      query: () => ({
        orderBy: () =>
          Promise.resolve([
            { id: 1, name: 'Аренда', kind: 'expense', parentId: null },
          ]),
      }),
    });
    const articleAccountModel = () => ({
      query: () => Promise.resolve([{ accountId: 500, articleId: 1 }]),
    });
    // Денежные счета: 100. Счёт 500 — расходный (normal debit).
    const accountModel = () => ({
      query: () => ({
        whereIn: () => Promise.resolve([{ id: 500, accountNormal: 'debit' }]),
        onBuild: () => Promise.resolve([{ id: 100 }]),
      }),
    });
    // Проводки периода: cashflow-расход (касса 100 / расход 500 на 150000).
    const accountTransactionModel = () => ({
      query: () => ({
        onBuild: () =>
          Promise.resolve([
            {
              referenceType: 'CashflowTransaction',
              referenceId: 1,
              accountId: 100,
              debit: 0,
              credit: 150000,
              transactionType: 'OtherExpense',
            },
            {
              referenceType: 'CashflowTransaction',
              referenceId: 1,
              accountId: 500,
              debit: 150000,
              credit: 0,
              transactionType: 'OtherExpense',
            },
          ]),
      }),
    });

    const service = new ArticlesCashflowRollupService(
      articleModel as any,
      articleAccountModel as any,
      accountModel as any,
      accountTransactionModel as any,
    );

    const rows = await service.getRollup({
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    } as any);
    const arenda = rows.find((r: any) => r.id === 1);
    expect(arenda.amount).toBe(150000);
  });
});
