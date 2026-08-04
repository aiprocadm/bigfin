import { GetMarketingMetricsService } from './GetMarketingMetrics.service';

/** Заглушка построителя запросов: цепочка возвращает себя, await — строки. */
function queryStub(rows: any) {
  const builder: any = {};
  [
    'modify',
    'select',
    'where',
    'whereIn',
    'orderBy',
    'countDistinct',
    'first',
  ].forEach((m) => {
    builder[m] = jest.fn(() => builder);
  });
  builder.then = (resolve: any, reject: any) =>
    Promise.resolve(rows).then(resolve, reject);
  return builder;
}

function modelStub(...answers: any[]) {
  let i = 0;
  const proxy = () => ({
    query: () => {
      const b = queryStub(answers[Math.min(i, answers.length - 1)]);
      i += 1;
      return b;
    },
  });
  (proxy as any).used = () => i;
  return proxy as any;
}

const rollupStub = (rows: any[]) => ({ getRollup: jest.fn().mockResolvedValue(rows) });

/**
 * Свёртка статей: выручка 100 000, расходы 40 000 → маржа 60%.
 * Берутся только корневые строки (`parentId: null`) — их суммы уже включают
 * поддерево.
 */
const plRows = [
  { id: 1, name: 'Выручка', kind: 'income', amount: 100000, parentId: null },
  { id: 2, name: 'Расходы', kind: 'expense', amount: 40000, parentId: null },
];

const settingsStub = (lifetime: number) => async () => ({
  get: jest.fn(() => lifetime),
});

const period = { fromDate: '2026-01-01', toDate: '2026-03-31' };

const build = (opts: {
  channels?: any[];
  monthly?: any[];
  customers?: any;
  lifetime?: number;
  rollupRows?: any[];
}) =>
  new GetMarketingMetricsService(
    rollupStub(opts.rollupRows ?? plRows) as any,
    modelStub(opts.channels ?? []),
    modelStub(opts.monthly ?? []),
    modelStub(opts.customers ?? { c: 0 }),
    settingsStub(opts.lifetime ?? 0) as any,
  );

describe('GetMarketingMetricsService — расходы по каналам', () => {
  it('складывает расходы и новых клиентов по месяцам периода', async () => {
    const service = build({
      channels: [
        { id: 1, name: 'Директ' },
        { id: 2, name: 'Таргет' },
      ],
      monthly: [
        { channelId: 1, spend: 30000, newCustomers: 10 },
        { channelId: 1, spend: 20000, newCustomers: 5 },
        { channelId: 2, spend: 25000, newCustomers: 5 },
      ],
      customers: { c: 40 },
    });

    const res = await service.getMetrics(period);

    const direct = res.channels.find((c) => c.channelId === 1)!;
    expect(direct).toMatchObject({ name: 'Директ', spend: 50000, newCustomers: 15 });
    // Стоимость привлечения клиента: 50 000 / 15.
    expect(direct.cac.value).toBeCloseTo(3333.33, 1);
    expect(res.totalSpend).toBe(75000);
    expect(res.totalNewCustomers).toBe(20);
    expect(res.hasData).toBe(true);
  });

  it('канал без введённых цифр показывается с нулями, а не пропадает', async () => {
    const service = build({
      channels: [{ id: 1, name: 'Директ' }, { id: 7, name: 'Радио' }],
      monthly: [{ channelId: 1, spend: 10000, newCustomers: 4 }],
      customers: { c: 4 },
    });

    const res = await service.getMetrics(period);

    const radio = res.channels.find((c) => c.channelId === 7)!;
    expect(radio).toMatchObject({ spend: 0, newCustomers: 0 });
    expect(radio.cac.applicable).toBe(false);
  });

  it('без введённых маркетинговых цифр hasData=false — интерфейс покажет подсказку', async () => {
    const service = build({
      channels: [{ id: 1, name: 'Директ' }],
      monthly: [],
      customers: { c: 3 },
    });

    const res = await service.getMetrics(period);

    expect(res.hasData).toBe(false);
    expect(res.totalSpend).toBe(0);
  });

  it('когда каналов нет, за месячными цифрами не ходит', async () => {
    const monthly = modelStub([{ channelId: 1, spend: 1 }]);
    const service = new GetMarketingMetricsService(
      rollupStub(plRows) as any,
      modelStub([]),
      monthly,
      modelStub({ c: 0 }),
      settingsStub(0) as any,
    );

    const res = await service.getMetrics(period);

    expect(res.channels).toEqual([]);
    expect(monthly.used()).toBe(0);
  });
});

describe('GetMarketingMetricsService — итоговые показатели', () => {
  it('считает выручку, маржу, средний чек, CAC, ROMI и LTV', async () => {
    const service = build({
      channels: [{ id: 1, name: 'Директ' }],
      monthly: [{ channelId: 1, spend: 20000, newCustomers: 10 }],
      customers: { c: 50 },
      lifetime: 6,
    });

    const res = await service.getMetrics(period);

    expect(res.revenue).toBe(100000);
    expect(res.margin).toBeCloseTo(0.6, 5);
    expect(res.customerCount).toBe(50);
    expect(res.averageCheck.value).toBe(2000); // 100 000 / 50
    expect(res.cacTotal.value).toBe(2000); // 20 000 / 10
    // ROMI здесь — «рублей выручки на рубль маркетинга» (решение основателя,
    // в интерфейсе подписано так же): 100 000 / 20 000.
    expect(res.romi.value).toBeCloseTo(5, 5);
    expect(res.ltv.value).toBeCloseTo(7200, 5); // 2000 × 0.6 × 6
    expect(res.customerLifetimeMonths).toBe(6);
  });

  it('без клиентов средний чек не считается, а не делится на ноль', async () => {
    const service = build({
      channels: [{ id: 1, name: 'Директ' }],
      monthly: [{ channelId: 1, spend: 5000, newCustomers: 0 }],
      customers: { c: 0 },
      lifetime: 6,
    });

    const res = await service.getMetrics(period);

    expect(res.averageCheck.applicable).toBe(false);
    // Расходы есть, а привлечённых клиентов нет — стоимость привлечения неприменима.
    expect(res.cacTotal.applicable).toBe(false);
  });

  it('без расходов на маркетинг ROMI неприменим', async () => {
    const service = build({
      channels: [{ id: 1, name: 'Директ' }],
      monthly: [{ channelId: 1, spend: 0, newCustomers: 3 }],
      customers: { c: 10 },
    });

    const res = await service.getMetrics(period);

    expect(res.romi.applicable).toBe(false);
  });

  it('не заданный срок жизни клиента делает LTV неприменимым', async () => {
    const service = build({
      channels: [{ id: 1, name: 'Директ' }],
      monthly: [{ channelId: 1, spend: 10000, newCustomers: 5 }],
      customers: { c: 20 },
      lifetime: 0,
    });

    const res = await service.getMetrics(period);

    expect(res.customerLifetimeMonths).toBe(0);
    expect(res.ltv.applicable).toBe(false);
  });

  it('число клиентов из базы приходит строкой и считается числом', async () => {
    const service = build({
      channels: [],
      customers: { c: '25' },
    });

    const res = await service.getMetrics(period);

    expect(res.customerCount).toBe(25);
    expect(res.averageCheck.value).toBe(4000); // 100 000 / 25
  });
});
