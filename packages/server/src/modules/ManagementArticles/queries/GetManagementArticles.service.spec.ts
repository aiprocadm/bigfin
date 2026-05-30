import { GetManagementArticlesService } from './GetManagementArticles.service';

describe('GetManagementArticlesService', () => {
  const flat = [
    { id: 1, name: 'Доходы', parentId: null },
    { id: 2, name: 'Выручка', parentId: 1 },
  ];

  const makeBuilder = (rows: any[]) => {
    const builder: any = {
      where: () => builder,
      orderBy: () => builder,
      onBuild: (cb: any) => {
        cb(builder);
        return Promise.resolve(rows);
      },
    };
    return builder;
  };

  const buildService = () => {
    const articleModel = () => ({ query: () => makeBuilder(flat) });
    return new GetManagementArticlesService(articleModel as any);
  };

  it('returns a flat list by default', async () => {
    const res = await buildService().getManagementArticles({});
    expect(res.data).toHaveLength(2);
    expect((res.data[0] as any).children).toBeUndefined();
  });

  it('returns a nested tree when tree=true', async () => {
    const res = await buildService().getManagementArticles({ tree: 'true' });
    expect(res.data).toHaveLength(1);
    expect((res.data[0] as any).children).toHaveLength(1);
  });

  // A model stub that honours a `where('kind', …)` clause, mimicking how the
  // database would drop non-matching rows — needed to exercise the tree+kind
  // interaction.
  const makeKindAwareService = (rows: any[]) => {
    let kindFilter: string | undefined;
    const builder: any = {
      where: (col: string, val: any) => {
        if (col === 'kind') kindFilter = val;
        return builder;
      },
      orderBy: () => builder,
      onBuild: (cb: (qb: any) => void) => {
        cb(builder);
        const out = kindFilter
          ? rows.filter((r) => r.kind === kindFilter)
          : rows;
        return Promise.resolve(out);
      },
    };
    const articleModel = () => ({ query: () => builder });
    return new GetManagementArticlesService(articleModel as any);
  };

  it('does not surface a kind-matching child as a fake root when its parent is filtered out (tree + kind)', async () => {
    // id 2 (expense) is mis-nested under id 1 (income). Filtering the flat list
    // by kind first would drop the parent and orphan the child into a root.
    const flat = [
      { id: 1, name: 'Доходы', parentId: null, kind: 'income' },
      { id: 2, name: 'Корректировка', parentId: 1, kind: 'expense' },
    ];

    const res = await makeKindAwareService(flat).getManagementArticles({
      tree: 'true',
      kind: 'expense',
    });

    // Only whole expense-rooted subtrees are returned (here: none).
    expect(res.data).toHaveLength(0);
  });

  it('returns whole subtrees whose root matches the kind filter (tree + kind)', async () => {
    const flat = [
      { id: 1, name: 'Доходы', parentId: null, kind: 'income' },
      { id: 2, name: 'Выручка', parentId: 1, kind: 'income' },
      { id: 3, name: 'Расходы', parentId: null, kind: 'expense' },
      { id: 4, name: 'Аренда', parentId: 3, kind: 'expense' },
    ];

    const res = await makeKindAwareService(flat).getManagementArticles({
      tree: 'true',
      kind: 'income',
    });

    expect(res.data).toHaveLength(1);
    expect((res.data[0] as any).id).toBe(1);
    expect((res.data[0] as any).children).toHaveLength(1);
    expect((res.data[0] as any).children[0].id).toBe(2);
  });
});
