import {
  ArticlesPlRollupService,
  accountNet,
  foldAccountsIntoArticles,
  rollupAmountsToAncestors,
} from './ArticlesPlRollup.service';

describe('accountNet (normal-aware sign)', () => {
  it('credit-normal account (income): credit - debit', () => {
    expect(accountNet(300, 0, 'credit')).toBe(300);
    expect(accountNet(500, 200, 'credit')).toBe(300);
  });

  it('debit-normal account (expense): debit - credit → positive magnitude', () => {
    expect(accountNet(0, 150, 'debit')).toBe(150);
    expect(accountNet(20, 170, 'debit')).toBe(150);
  });

  it('treats null/undefined credit/debit as 0', () => {
    expect(accountNet(undefined as any, undefined as any, 'credit')).toBe(0);
    expect(accountNet(100, undefined as any, 'credit')).toBe(100);
  });
});

describe('foldAccountsIntoArticles', () => {
  const articles = [
    { id: 1, name: 'Выручка', kind: 'income', parentId: null },
    { id: 2, name: 'Аренда', kind: 'expense', parentId: null },
  ];
  // accountId -> articleId
  const map = [
    { accountId: 100, articleId: 1 },
    { accountId: 101, articleId: 1 },
    { accountId: 200, articleId: 2 },
  ];
  // nets already normal-signed (income & expense both positive)
  const accountNets = [
    { accountId: 100, net: 300 },
    { accountId: 101, net: 200 },
    { accountId: 200, net: 150 },
    { accountId: 999, net: 50 }, // unmapped — must be ignored
  ];

  it('sums account nets into their article, ignoring unmapped accounts', () => {
    const result = foldAccountsIntoArticles(articles, map, accountNets);

    expect(result.find((a) => a.id === 1)!.amount).toBe(500); // 300 + 200
    expect(result.find((a) => a.id === 2)!.amount).toBe(150);
  });

  it('total of article amounts equals sum of mapped account nets (invariant)', () => {
    const result = foldAccountsIntoArticles(articles, map, accountNets);

    const mappedIds = new Set(map.map((m) => m.accountId));
    const mappedTotal = accountNets
      .filter((a) => mappedIds.has(a.accountId))
      .reduce((sum, a) => sum + a.net, 0);
    const articlesTotal = result.reduce((sum, a) => sum + a.amount, 0);

    expect(articlesTotal).toBe(mappedTotal); // 650
  });
});

describe('rollupAmountsToAncestors (parent subtree totals)', () => {
  it('each parent reports the sum of its whole subtree', () => {
    // Доходы(1) ← Выручка(3); Расходы(2) ← Аренда(4) ← Субаренда(5)
    const folded = [
      { id: 1, name: 'Доходы', kind: 'income', parentId: null, amount: 0 },
      { id: 2, name: 'Расходы', kind: 'expense', parentId: null, amount: 0 },
      { id: 3, name: 'Выручка', kind: 'income', parentId: 1, amount: 500 },
      { id: 4, name: 'Аренда', kind: 'expense', parentId: 2, amount: 150 },
      { id: 5, name: 'Субаренда', kind: 'expense', parentId: 4, amount: 50 },
    ];
    const result = rollupAmountsToAncestors(folded);
    const amountOf = (id: number) => result.find((a) => a.id === id)!.amount;

    expect(amountOf(5)).toBe(50); // leaf unchanged
    expect(amountOf(4)).toBe(200); // 150 own + 50 child
    expect(amountOf(3)).toBe(500); // leaf unchanged
    expect(amountOf(2)).toBe(200); // 0 own + (150 + 50) subtree
    expect(amountOf(1)).toBe(500); // 0 own + 500 subtree
  });

  it('keeps a node with its own amount and no children unchanged', () => {
    const folded = [
      { id: 1, name: 'Прочее', kind: 'expense', parentId: null, amount: 42 },
    ];
    expect(rollupAmountsToAncestors(folded)[0].amount).toBe(42);
  });

  it('does not loop forever on a malformed parent cycle', () => {
    const folded = [
      { id: 1, name: 'A', kind: 'income', parentId: 2, amount: 10 },
      { id: 2, name: 'B', kind: 'income', parentId: 1, amount: 20 },
    ];
    expect(() => rollupAmountsToAncestors(folded)).not.toThrow();
  });
});

describe('ArticlesPlRollupService.getRollup (date filter)', () => {
  // Builds a service whose transaction query records every `modify` call, so we
  // can assert which query modifiers the rollup applied for a given date range.
  const makeService = () => {
    const modify = jest.fn().mockReturnThis();
    const txnQb: any = {
      sum: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      modify,
    };
    const txnBuilder = {
      onBuild: (cb: (qb: any) => void) => {
        cb(txnQb);
        return Promise.resolve([]);
      },
    };

    const articleModel = () => ({
      query: () => ({ orderBy: () => Promise.resolve([]) }),
    });
    const articleAccountModel = () => ({ query: () => Promise.resolve([]) });
    const accountTransactionModel = () => ({ query: () => txnBuilder });
    const accountModel = () => ({
      query: () => ({ whereIn: () => Promise.resolve([]) }),
    });

    const service = new ArticlesPlRollupService(
      articleModel as any,
      articleAccountModel as any,
      accountTransactionModel as any,
      accountModel as any,
    );
    return { service, modify };
  };

  it('applies the date filter when only fromDate is provided', async () => {
    const { service, modify } = makeService();

    await service.getRollup({ fromDate: '2026-01-01' } as any);

    expect(modify).toHaveBeenCalledWith(
      'filterDateRange',
      '2026-01-01',
      undefined,
    );
  });

  it('applies the date filter when only toDate is provided', async () => {
    const { service, modify } = makeService();

    await service.getRollup({ toDate: '2026-12-31' } as any);

    expect(modify).toHaveBeenCalledWith(
      'filterDateRange',
      undefined,
      '2026-12-31',
    );
  });

  it('does not apply the date filter when neither bound is provided', async () => {
    const { service, modify } = makeService();

    await service.getRollup({} as any);

    expect(modify).not.toHaveBeenCalledWith(
      'filterDateRange',
      expect.anything(),
      expect.anything(),
    );
  });
});
