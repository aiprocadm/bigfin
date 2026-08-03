import { GetBreakEvenService } from './GetBreakEven.service';

/**
 * Точка безубыточности (㉔): сколько нужно выручки, чтобы покрыть постоянные
 * расходы. Критичная тонкость — постоянные расходы берутся из СОБСТВЕННЫХ
 * сумм статей, а не из свёртки: иначе пометка и родителя, и потомка задвоит
 * сумму и точка безубыточности уедет вдвое.
 */
const article = (over: Record<string, any> = {}) => ({
  id: 1,
  parentId: null,
  kind: 'expense',
  costBehavior: 'variable',
  amount: 0,
  ...over,
});

function makeService(rollupRows: any[], ownRows: any[]) {
  const rollup = {
    getRollup: jest.fn().mockResolvedValue(rollupRows),
    getOwnAmounts: jest.fn().mockResolvedValue(ownRows),
  };
  return { service: new GetBreakEvenService(rollup as any), rollup };
}

/** Выручка 1000, расходы 600 → маржа 40%. */
const ROLLUP = [
  article({ id: 1, kind: 'income', amount: 1000 }),
  article({ id: 2, kind: 'expense', amount: 600 }),
];

describe('GetBreakEvenService', () => {
  it('считает точку безубыточности: постоянные расходы ÷ маржа', () => {
    return makeService(ROLLUP, [
      article({ id: 2, costBehavior: 'fixed', amount: 200 }),
    ])
      .service.getBreakEven({ fromDate: '2026-01-01', toDate: '2026-06-30' })
      .then((result) => {
        expect(result.revenue).toBe(1000);
        expect(result.margin).toBeCloseTo(0.4);
        expect(result.fixedCosts).toBe(200);
        // 200 / 0.4 = 500
        expect(result.breakEven).toEqual({ value: 500, applicable: true });
        expect(result.hasFixedArticles).toBe(true);
      });
  });

  it('берёт собственные суммы статей, а не свёртку — иначе сумма задвоится', async () => {
    const { service, rollup } = makeService(ROLLUP, [
      article({ id: 2, costBehavior: 'fixed', amount: 200 }),
    ]);

    await service.getBreakEven({ fromDate: '2026-01-01', toDate: '2026-06-30' });

    // Постоянные расходы читаются именно из собственных сумм.
    expect(rollup.getOwnAmounts).toHaveBeenCalled();
  });

  it('в постоянные расходы попадают только расходные статьи', async () => {
    const { service } = makeService(ROLLUP, [
      article({ id: 2, kind: 'expense', costBehavior: 'fixed', amount: 200 }),
      // Доходная статья с той же пометкой расходом не является.
      article({ id: 3, kind: 'income', costBehavior: 'fixed', amount: 900 }),
    ]);

    const result = await service.getBreakEven({});

    expect(result.fixedCosts).toBe(200);
  });

  it('переменные расходы в постоянные не попадают', async () => {
    const { service } = makeService(ROLLUP, [
      article({ id: 2, costBehavior: 'fixed', amount: 200 }),
      article({ id: 4, costBehavior: 'variable', amount: 350 }),
    ]);

    const result = await service.getBreakEven({});

    expect(result.fixedCosts).toBe(200);
  });

  it('несколько постоянных статей складываются с округлением до копеек', async () => {
    const { service } = makeService(ROLLUP, [
      article({ id: 2, costBehavior: 'fixed', amount: 100.115 }),
      article({ id: 3, costBehavior: 'fixed', amount: 50.005 }),
    ]);

    const result = await service.getBreakEven({});

    expect(result.fixedCosts).toBe(150.12);
  });

  it('без помеченных статей сообщает об этом и считает расходы нулевыми', async () => {
    const { service } = makeService(ROLLUP, [
      article({ id: 2, costBehavior: 'variable', amount: 600 }),
    ]);

    const result = await service.getBreakEven({});

    expect(result.hasFixedArticles).toBe(false);
    expect(result.fixedCosts).toBe(0);
    // При нулевых постоянных расходах точка безубыточности — ноль выручки.
    expect(result.breakEven).toEqual({ value: 0, applicable: true });
  });

  it('при нулевой или отрицательной марже точка безубыточности неприменима', async () => {
    // Расходы больше выручки — маржа отрицательная.
    const lossRollup = [
      article({ id: 1, kind: 'income', amount: 500 }),
      article({ id: 2, kind: 'expense', amount: 900 }),
    ];
    const { service } = makeService(lossRollup, [
      article({ id: 2, costBehavior: 'fixed', amount: 300 }),
    ]);

    const result = await service.getBreakEven({});

    expect(result.margin).toBeLessThan(0);
    expect(result.breakEven).toEqual({ value: 0, applicable: false });
  });

  it('без указанного периода берёт год с начала и по сегодня', async () => {
    const { service, rollup } = makeService(ROLLUP, []);

    await service.getBreakEven({});

    const [args] = rollup.getRollup.mock.calls[0];
    const year = new Date().getFullYear();
    expect(args.fromDate).toBe(`${year}-01-01`);
    expect(args.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('период передаётся в обе выборки одинаковый', async () => {
    const { service, rollup } = makeService(ROLLUP, []);

    await service.getBreakEven({ fromDate: '2026-03-01', toDate: '2026-03-31' });

    expect(rollup.getRollup.mock.calls[0][0]).toMatchObject({
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    });
    expect(rollup.getOwnAmounts.mock.calls[0][0]).toMatchObject({
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    });
  });
});
