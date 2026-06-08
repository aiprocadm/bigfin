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
      revenueByDeal: jest.fn().mockResolvedValue(revenueByDeal),
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
});
