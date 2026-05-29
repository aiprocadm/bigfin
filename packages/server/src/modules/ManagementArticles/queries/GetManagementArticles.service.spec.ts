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
});
