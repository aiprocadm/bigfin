import { ImportMoyskladProductsService } from './ImportMoyskladProducts.service';

/** Сырой товар МойСклад: цены в копейках. */
const raw = (over: Record<string, any> = {}) => ({
  id: 'ms-1',
  name: 'Стул офисный',
  code: 'СТУЛ-01',
  buyPrice: { value: 250000 }, // 2500 ₽ себестоимость
  salePrices: [{ value: 400000 }], // 4000 ₽ цена продажи
  ...over,
});

function makeDeps(products: any[], existing: { links?: any[]; items?: any[] } = {}) {
  const links = [...(existing.links ?? [])];
  const items = [...(existing.items ?? [])];

  const api = { list: jest.fn().mockResolvedValue(products) };
  const settings = { getToken: jest.fn().mockResolvedValue('TOKEN') };

  const query = (rows: any[]) => ({
    findOne: (where: any) =>
      Promise.resolve(
        rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ??
          undefined,
      ),
    insert: (data: any) => {
      const row = { id: rows.length + 1, ...data };
      rows.push(row);
      return Promise.resolve(row);
    },
    findById: (id: number) => ({
      patch: (attrs: any) => {
        const row = rows.find((r) => r.id === id);
        if (row) Object.assign(row, attrs);
        return Promise.resolve(1);
      },
    }),
  });

  const createItem = {
    createItem: jest.fn(async (dto: any) => {
      const row = { id: items.length + 100, ...dto };
      items.push(row);
      return row.id;
    }),
  };
  const uow = { withTransaction: (fn: any) => fn({} as any) };

  const service = new ImportMoyskladProductsService(
    uow as any,
    settings as any,
    api as any,
    (() => ({ query: () => query(links) })) as any,
    (() => ({ query: () => query(items) })) as any,
    createItem as any,
  );
  return { service, links, items, createItem, api };
}

describe('ImportMoyskladProductsService.preview', () => {
  it('показывает, что будет создано, ничего не записывая', async () => {
    const deps = makeDeps([raw(), raw({ id: 'ms-2', code: 'СТОЛ-01' })]);

    const report = await deps.service.preview();

    expect(report).toMatchObject({ toCreate: 2, toUpdate: 0 });
    expect(deps.createItem.createItem).not.toHaveBeenCalled();
    expect(deps.links).toHaveLength(0);
  });

  it('в образце показывает цены в рублях, а не копейках', async () => {
    const deps = makeDeps([raw()]);

    const report = await deps.service.preview();

    expect(report.sample[0]).toMatchObject({
      name: 'Стул офисный',
      costPrice: 2500,
      sellPrice: 4000,
    });
  });

  it('без подключённого МойСклад ничего не запрашивает', async () => {
    const deps = makeDeps([raw()]);
    (deps as any).service['settings'].getToken = jest
      .fn()
      .mockResolvedValue(null);

    const report = await deps.service.preview();

    expect(report).toMatchObject({ toCreate: 0, toUpdate: 0 });
    expect(deps.api.list).not.toHaveBeenCalled();
  });
});

describe('ImportMoyskladProductsService.import', () => {
  it('создаёт товар с себестоимостью и ценой продажи', async () => {
    const deps = makeDeps([raw()]);

    const result = await deps.service.import();

    expect(result).toMatchObject({ created: 1, updated: 0 });
    const dto = deps.createItem.createItem.mock.calls[0][0];
    expect(dto).toMatchObject({
      name: 'Стул офисный',
      code: 'СТУЛ-01',
      costPrice: 2500,
      sellPrice: 4000,
      type: 'service',
    });
    expect(deps.links).toHaveLength(1);
  });

  it('повторный импорт обновляет, а не задваивает', async () => {
    const deps = makeDeps([raw()]);
    await deps.service.import();

    const again = await deps.service.import();

    expect(again).toMatchObject({ created: 0, updated: 1 });
    expect(deps.createItem.createItem).toHaveBeenCalledTimes(1);
    expect(deps.links).toHaveLength(1);
  });

  it('подхватывает товар, заведённый руками, по артикулу', async () => {
    const deps = makeDeps([raw()], {
      items: [{ id: 42, code: 'СТУЛ-01', name: 'Старое имя' }],
    });

    const result = await deps.service.import();

    expect(deps.createItem.createItem).not.toHaveBeenCalled();
    expect(result.updated).toBe(1);
    expect(deps.links[0].entityId).toBe(42);
  });

  it('обновление не затирает заполненные поля пустыми значениями', async () => {
    const deps = makeDeps(
      // У товара в МойСклад нет цен и артикула.
      [raw({ code: '', buyPrice: null, salePrices: [] })],
      {
        links: [{ id: 1, entityType: 'item', externalId: 'ms-1', entityId: 42 }],
        items: [{ id: 42, code: 'СТУЛ-01', costPrice: 999, sellPrice: 1999 }],
      },
    );

    await deps.service.import();

    const item = deps.items.find((i) => i.id === 42);
    expect(item.code).toBe('СТУЛ-01');
    expect(item.costPrice).toBe(999);
    expect(item.sellPrice).toBe(1999);
    // Имя из МойСклад при этом обновляется.
    expect(item.name).toBe('Стул офисный');
  });

  it('товар без идентификатора пропускается — сопоставлять нечем', async () => {
    const deps = makeDeps([raw(), raw({ id: '', code: 'X-1' })]);

    const result = await deps.service.import();

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('товар без имени импортируется с именем-заглушкой от маппера', async () => {
    const deps = makeDeps([raw({ id: 'ms-9', name: '', code: 'Y-1' })]);

    const result = await deps.service.import();

    expect(result.created).toBe(1);
    expect(deps.createItem.createItem.mock.calls[0][0].name).toBe('Товар ms-9');
  });

  it('нулевая себестоимость переносится как ноль, а не теряется', async () => {
    const deps = makeDeps([raw({ buyPrice: { value: 0 } })]);

    await deps.service.import();

    const dto = deps.createItem.createItem.mock.calls[0][0];
    expect(dto.costPrice).toBe(0);
  });
});
