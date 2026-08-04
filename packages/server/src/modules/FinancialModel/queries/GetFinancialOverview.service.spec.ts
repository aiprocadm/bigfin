import { GetFinancialOverviewService } from './GetFinancialOverview.service';

/**
 * Обзор финмодели (㉔): выручка/прибыль/маржа за период, выручка на
 * сотрудника и помесячный график. Считается на лету из свёртки статей —
 * тестов на сборку результата не было.
 */
const row = (over: Record<string, any> = {}) => ({
  id: 1,
  parentId: null,
  kind: 'income',
  amount: 0,
  ...over,
});

/** Свёртка: выручка 1000, расходы 400 → прибыль 600, маржа 60%. */
const PROFITABLE = [
  row({ id: 1, kind: 'income', amount: 1000 }),
  row({ id: 2, kind: 'expense', amount: 400 }),
];

function makeService(options: {
  rollupByPeriod?: (from: string) => any[];
  rows?: any[];
  employees?: number;
}) {
  const rollup = {
    getRollup: jest.fn(async ({ fromDate }: any) =>
      options.rollupByPeriod
        ? options.rollupByPeriod(fromDate)
        : (options.rows ?? PROFITABLE),
    ),
  };
  const employeeModel = () => ({
    query: () => ({
      where: () => ({
        count: () => ({
          first: async () => ({ c: options.employees ?? 0 }),
        }),
      }),
    }),
  });

  return {
    service: new GetFinancialOverviewService(rollup as any, employeeModel as any),
    rollup,
  };
}

describe('GetFinancialOverviewService — итоги периода', () => {
  it('считает выручку, расходы, прибыль и маржу', async () => {
    const { service } = makeService({ employees: 0 });

    const result = await service.getOverview({
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    } as any);

    expect(result.revenue).toBe(1000);
    expect(result.costs).toBe(400);
    expect(result.profit).toBe(600);
    expect(result.margin).toBeCloseTo(0.6);
  });

  it('выручка на сотрудника считается по активным сотрудникам', async () => {
    const { service } = makeService({ employees: 4 });

    const result = await service.getOverview({
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    } as any);

    expect(result.employeeCount).toBe(4);
    expect(result.revenuePerEmployee).toBe(250);
    expect(result.revenuePerEmployeeApplicable).toBe(true);
  });

  it('без сотрудников показатель помечается неприменимым, а не делится на ноль', async () => {
    const { service } = makeService({ employees: 0 });

    const result = await service.getOverview({
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    } as any);

    expect(result.employeeCount).toBe(0);
    expect(result.revenuePerEmployeeApplicable).toBe(false);
  });
});

describe('GetFinancialOverviewService — график по месяцам', () => {
  it('отдаёт по точке на каждый месяц периода, в порядке месяцев', async () => {
    const { service } = makeService({
      // Каждый месяц — своя выручка, чтобы проверить и порядок, и значения.
      rollupByPeriod: (from) =>
        from.startsWith('2026-01')
          ? [row({ kind: 'income', amount: 100 })]
          : from.startsWith('2026-02')
            ? [row({ kind: 'income', amount: 200 })]
            : [row({ kind: 'income', amount: 300 })],
      employees: 1,
    });

    const result = await service.getOverview({
      fromDate: '2026-01-15',
      toDate: '2026-03-10',
    } as any);

    expect(result.marginOverTime.map((p) => p.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
    expect(result.marginOverTime.map((p) => p.revenue)).toEqual([100, 200, 300]);
  });

  it('период внутри одного месяца даёт одну точку', async () => {
    const { service } = makeService({ employees: 1 });

    const result = await service.getOverview({
      fromDate: '2026-06-05',
      toDate: '2026-06-20',
    } as any);

    expect(result.marginOverTime).toHaveLength(1);
    expect(result.marginOverTime[0].month).toBe('2026-06');
  });

  it('в каждой точке — выручка, прибыль и маржа месяца', async () => {
    const { service } = makeService({ employees: 1 });

    const result = await service.getOverview({
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    } as any);

    expect(result.marginOverTime[0]).toMatchObject({
      month: '2026-06',
      revenue: 1000,
      profit: 600,
    });
    expect(result.marginOverTime[0].margin).toBeCloseTo(0.6);
  });
});

describe('GetFinancialOverviewService — период по умолчанию', () => {
  it('без дат берёт с начала года по сегодня', async () => {
    const { service, rollup } = makeService({ employees: 1 });

    await service.getOverview({} as any);

    const [args] = rollup.getRollup.mock.calls[0];
    expect(args.fromDate).toBe(`${new Date().getFullYear()}-01-01`);
    expect(args.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
