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
    const where = jest.fn().mockReturnThis();
    const txnQb: any = {
      sum: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      orWhereNull: jest.fn().mockReturnThis(),
      where,
      modify,
    };
    const txnBuilder = {
      onBuild: (cb: (qb: any) => void) => {
        cb(txnQb);
        return Promise.resolve([]);
      },
    };

    const articleModel = () => ({
      query: () => ({
        whereIn: () => ({ orderBy: () => Promise.resolve([]) }),
      }),
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
    return { service, modify, where, txnQb };
  };

  /**
   * Условия отбора по датам, развёрнутые из вложенных `where(fn)`: с месяцем
   * начисления (FT-013 ТЗ-3) отбор — «по дате ИЛИ по месяцу начисления».
   */
  const conditionsOf = (where: jest.Mock) => {
    const found: any[] = [];
    const recorder = (): any => {
      const qb: any = {
        where: (...args: any[]) => {
          if (typeof args[0] === 'function') args[0](recorder());
          else found.push(args);
          return qb;
        },
        orWhere: (fn: any) => {
          fn(recorder());
          return qb;
        },
        whereNull: (column: string) => {
          found.push([column, 'is null']);
          return qb;
        },
        whereNotNull: (column: string) => {
          found.push([column, 'is not null']);
          return qb;
        },
      };
      return qb;
    };
    where.mock.calls
      .filter(([arg]) => typeof arg === 'function')
      .forEach(([fn]) => fn(recorder()));
    return found;
  };

  it('applies the date filter when only fromDate is provided', async () => {
    const { service, where } = makeService();

    await service.getRollup({ fromDate: '2026-01-01' } as any);

    const conditions = conditionsOf(where);
    expect(conditions).toContainEqual(['date', '>=', '2026-01-01']);
    expect(conditions).toContainEqual(['accrualPeriod', '>=', '2026-01']);
    expect(conditions.some(([column, op]) => column === 'date' && op === '<=')).toBe(false);
  });

  it('applies the date filter when only toDate is provided', async () => {
    const { service, where } = makeService();

    await service.getRollup({ toDate: '2026-12-31' } as any);

    const conditions = conditionsOf(where);
    expect(conditions).toContainEqual(['date', '<=', '2026-12-31']);
    expect(conditions).toContainEqual(['accrualPeriod', '<=', '2026-12']);
    expect(conditions.some(([column, op]) => column === 'date' && op === '>=')).toBe(false);
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

  it('applies the project filter when projectId is provided', async () => {
    const { service, modify } = makeService();

    await service.getRollup({ projectId: 5 } as any);

    expect(modify).toHaveBeenCalledWith('filterByProjects', [5]);
  });

  it('calls whereNull("projectId") when unassignedProject is true', async () => {
    const whereNull = jest.fn().mockReturnThis();
    const txnQb: any = {
      sum: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      modify: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNull,
    };
    const txnBuilder = {
      onBuild: (cb: (qb: any) => void) => {
        cb(txnQb);
        return Promise.resolve([]);
      },
    };
    const articleModel = () => ({
      query: () => ({
        whereIn: () => ({ orderBy: () => Promise.resolve([]) }),
      }),
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

    await service.getRollup({ unassignedProject: true } as any);

    expect(whereNull).toHaveBeenCalledWith('projectId');
  });

  /**
   * FT-008 ТЗ-3: номер юрлица доходит до запроса к проводкам.
   *
   * Раньше свёртка принимала `legalEntityIds` и выбрасывала: «Деньги по
   * статьям», бюджет и безубыточность считались по всей группе.
   */
  it('накладывает отбор по выбранному юрлицу', async () => {
    const { service, where, txnQb } = makeService();

    await service.getRollup({ legalEntityIds: [7] } as any);

    const group = where.mock.calls.find(([arg]) => typeof arg === 'function');
    expect(group).toBeDefined();

    // Раскрываем группу «юрлицо ИЛИ пусто» на том же поддельном запросе.
    group![0](txnQb);
    expect(txnQb.whereIn).toHaveBeenCalledWith('legal_entity_id', [7]);
  });

  it('в сводном режиме убирает внутригрупповые обороты', async () => {
    const { service, where } = makeService();

    await service.getRollup({} as any);

    expect(where).toHaveBeenCalledWith('is_intercompany', false);
  });

  it('отбирает по направлениям разреза отчёта', async () => {
    const { service, txnQb } = makeService();

    await service.getRollup({ projectsIds: [4] } as any);

    expect(txnQb.whereIn).toHaveBeenCalledWith('project_id', [4]);
  });
});
