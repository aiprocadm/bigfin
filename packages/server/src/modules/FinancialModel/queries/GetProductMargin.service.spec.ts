import { GetProductMarginService } from './GetProductMargin.service';

/**
 * Заглушка построителя запросов Objection: любые методы цепочки возвращают
 * сам построитель, а `await` отдаёт заранее подготовленные строки.
 */
function queryStub(rows: any) {
  const builder: any = {};
  const chain = [
    'modify',
    'select',
    'where',
    'whereIn',
    'sum',
    'groupBy',
    'orderBy',
    'first',
    'countDistinct',
  ];
  chain.forEach((m) => {
    builder[m] = jest.fn(() => builder);
  });
  builder.then = (resolve: any, reject: any) =>
    Promise.resolve(rows).then(resolve, reject);
  return builder;
}

/** Модель, отдающая ответы по очереди — на каждый вызов query() свой. */
function modelStub(...answers: any[]) {
  let i = 0;
  const calls: any[] = [];
  const proxy = () => ({
    query: () => {
      const b = queryStub(answers[Math.min(i, answers.length - 1)]);
      i += 1;
      calls.push(b);
      return b;
    },
  });
  (proxy as any).calls = calls;
  (proxy as any).used = () => i;
  return proxy as any;
}

const period = { fromDate: '2026-01-01', toDate: '2026-12-31' };

describe('GetProductMarginService', () => {
  it('считает маржу по товару: выручка − себестоимость проданного', async () => {
    const invoices = modelStub([{ id: 1 }, { id: 2 }]);
    const entries = modelStub([
      { itemId: 10, quantity: 2, rate: 500 }, // 1000
      { itemId: 10, quantity: 1, rate: 500 }, // +500
      { itemId: 20, quantity: 3, rate: 100 }, // 300
    ]);
    const lots = modelStub([
      { itemId: 10, cost: 900 },
      { itemId: 20, cost: 250 },
    ]);
    // Первый вызов — список инвентарных товаров, второй — имена.
    const items = modelStub(
      [{ id: 10 }, { id: 20 }],
      [
        { id: 10, name: 'Стул' },
        { id: 20, name: 'Стол' },
      ],
    );

    const service = new GetProductMarginService(invoices, entries, lots, items);
    const res = await service.getProductMargin(period);

    const chair = res.products.find((p) => p.itemId === 10)!;
    expect(chair).toMatchObject({ name: 'Стул', revenue: 1500, cost: 900 });
    expect(chair.grossMargin).toBe(600);

    expect(res.totals).toEqual({ revenue: 1800, cost: 1150, grossMargin: 650 });
  });

  it('без продаж за период не ходит за строками и отдаёт нули', async () => {
    const invoices = modelStub([]);
    const entries = modelStub([{ itemId: 10, quantity: 1, rate: 100 }]);
    const lots = modelStub([]);
    const items = modelStub([{ id: 10 }], []);

    const service = new GetProductMarginService(invoices, entries, lots, items);
    const res = await service.getProductMargin(period);

    expect(res.products).toEqual([]);
    expect(res.totals).toEqual({ revenue: 0, cost: 0, grossMargin: 0 });
    // Запрос строк документов при отсутствии счетов не делается.
    expect(entries.used()).toBe(0);
  });

  it('без инвентарных товаров выручка не считается', async () => {
    const invoices = modelStub([{ id: 1 }]);
    const entries = modelStub([{ itemId: 10, quantity: 1, rate: 100 }]);
    const lots = modelStub([]);
    const items = modelStub([], []);

    const service = new GetProductMarginService(invoices, entries, lots, items);
    const res = await service.getProductMargin(period);

    expect(res.totals.revenue).toBe(0);
    expect(entries.used()).toBe(0);
  });

  it('товар без выручки, но со списанной себестоимостью даёт отрицательную маржу', async () => {
    const invoices = modelStub([{ id: 1 }]);
    const entries = modelStub([]);
    const lots = modelStub([{ itemId: 30, cost: 400 }]);
    const items = modelStub([{ id: 30 }], [{ id: 30, name: 'Лампа' }]);

    const service = new GetProductMarginService(invoices, entries, lots, items);
    const res = await service.getProductMargin(period);

    expect(res.products).toHaveLength(1);
    expect(res.products[0]).toMatchObject({ revenue: 0, cost: 400 });
    expect(res.products[0].grossMargin).toBe(-400);
  });

  it('если имя товара не нашлось, показывает его номер, а не пустоту', async () => {
    const invoices = modelStub([{ id: 1 }]);
    const entries = modelStub([{ itemId: 55, quantity: 1, rate: 100 }]);
    const lots = modelStub([]);
    const items = modelStub([{ id: 55 }], []);

    const service = new GetProductMarginService(invoices, entries, lots, items);
    const res = await service.getProductMargin(period);

    expect(res.products[0].name).toBe('#55');
  });

  it('строковые суммы из базы складываются как числа, а не как текст', async () => {
    const invoices = modelStub([{ id: 1 }]);
    const entries = modelStub([{ itemId: 10, quantity: '2', rate: '250.5' }]);
    const lots = modelStub([{ itemId: 10, cost: '100.25' }]);
    const items = modelStub([{ id: 10 }], [{ id: 10, name: 'Стул' }]);

    const service = new GetProductMarginService(invoices, entries, lots, items);
    const res = await service.getProductMargin(period);

    expect(res.products[0].revenue).toBe(501);
    expect(res.products[0].cost).toBe(100.25);
  });
});
