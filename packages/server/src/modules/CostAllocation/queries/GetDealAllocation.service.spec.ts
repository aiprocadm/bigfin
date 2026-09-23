// © 2026 Bigfin
import { GetDealAllocationService } from './GetDealAllocation.service';

describe('GetDealAllocationService', () => {
  const rule = {
    id: 5,
    name: 'Аренда',
    sourceArticleId: 42,
    allocationKey: 'revenue',
    manualShares: null,
    targetDealIds: null,
    validFrom: null,
    validTo: null,
    isActive: true,
  };

  const build = (
    rules: any[],
    pool: number,
    revenueByDeal: Record<number, number>,
  ) => {
    const poolService = { poolFor: jest.fn().mockResolvedValue(pool) };
    const revenueService = {
      metricsByDeal: jest.fn().mockResolvedValue(
        Object.fromEntries(
          Object.entries(revenueByDeal).map(([id, revenue]) => [
            id,
            { id: Number(id), name: `Сделка ${id}`, revenue, grossProfit1: revenue / 2 },
          ]),
        ),
      ),
    };
    // ruleModel().query() resolves to `rules` array directly
    const model = () => ({ query: () => Promise.resolve(rules) });
    return new GetDealAllocationService(
      model as any,
      poolService as any,
      revenueService as any,
    );
  };

  it("returns this deal's revenue-proportional share of the pool", async () => {
    const svc = build([rule], 100, { 1: 300, 2: 100 });
    const lines = await svc.getForDeal(1, {});
    expect(lines).toEqual([
      { ruleId: 5, ruleName: 'Аренда', articleId: 42, amount: 75 },
    ]);
  });

  it('excludes inactive rules', async () => {
    const svc = build([{ ...rule, isActive: false }], 100, { 1: 300, 2: 100 });
    expect(await svc.getForDeal(1, {})).toEqual([]);
  });

  it('uses manual shares when key is manual_share', async () => {
    const svc = build(
      [
        {
          ...rule,
          allocationKey: 'manual_share',
          manualShares: { '1': 1, '2': 1 },
        },
      ],
      100,
      { 1: 999, 2: 0 },
    );
    const lines = await svc.getForDeal(1, {});
    expect(lines[0].amount).toBe(50);
  });

  it('пустой список сделок у правила — все сделки, а не «никому» (FT-011)', async () => {
    const svc = build([{ ...rule, targetDealIds: [] }], 100, { 1: 300, 2: 100 });
    expect((await svc.getForDeal(1, {}))[0].amount).toBe(75);
  });

  it('новые базы: поровну и по ВП1', async () => {
    const equal = build([{ ...rule, allocationKey: 'equal' }], 100, { 1: 300, 2: 100 });
    expect((await equal.getForDeal(2, {}))[0].amount).toBe(50);

    const gp1 = build([{ ...rule, allocationKey: 'gross_profit_1' }], 100, { 1: 300, 2: 100 });
    expect((await gp1.getForDeal(1, {}))[0].amount).toBe(75);
  });

  it('правило «по направлениям» в прибыльность сделки не идёт', async () => {
    const svc = build([{ ...rule, targetType: 'direction' }], 100, { 1: 300, 2: 100 });
    expect(await svc.getForDeal(1, {})).toEqual([]);
  });
});
