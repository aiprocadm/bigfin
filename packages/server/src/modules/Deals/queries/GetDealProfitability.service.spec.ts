import { GetDealProfitabilityService } from './GetDealProfitability.service';

describe('GetDealProfitabilityService', () => {
  // revenue=600, costs=390, profit=210 from the default rollup mock
  const makeService = (deal: any, allocationLines: any[] = []) => {
    const rollup = {
      getRollup: jest.fn().mockResolvedValue([
        { id: 1, name: 'Доходы', kind: 'income', parentId: null, amount: 600 },
        { id: 2, name: 'Расходы', kind: 'expense', parentId: null, amount: 390 },
      ]),
    };
    const dealModel = () => ({
      query: () => ({ findById: () => Promise.resolve(deal) }),
    });
    const allocation = {
      getForDeal: jest.fn().mockResolvedValue(allocationLines),
    };
    const service = new GetDealProfitabilityService(
      rollup as any,
      dealModel as any,
      allocation as any,
    );
    return { service, rollup, allocation };
  };

  it('filters rollup by dealId and returns margin', async () => {
    const { service, rollup } = makeService({ id: 5, name: 'X' });

    const res = await service.getProfitability(5, {});

    expect(rollup.getRollup).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 5 }),
    );
    expect(res).toMatchObject({
      dealId: 5,
      revenue: 600,
      costs: 390,
      profit: 210,
    });
  });

  it('throws when the deal is missing', async () => {
    const { service } = makeService(undefined);
    await expect(service.getProfitability(99, {})).rejects.toThrow();
  });

  it('overlays allocation when rules return lines', async () => {
    const line = { ruleId: 1, ruleName: 'Аренда', articleId: 9, amount: 20 };
    const { service } = makeService({ id: 5, name: 'X' }, [line]);

    const res = await service.getProfitability(5, {});

    // allocatedTotal = 20; profit was 210; profitAfterAllocation = 210 − 20 = 190
    expect(res.allocatedTotal).toBe(20);
    expect(res.profitAfterAllocation).toBe(190);
    expect(res.costsAfterAllocation).toBe(410); // 390 + 20
    expect(res.marginAfterAllocation).toBeCloseTo(190 / 600);
    expect(res.allocations).toEqual([line]);
  });

  it('does not add allocation fields when no rules apply', async () => {
    const { service } = makeService({ id: 5, name: 'X' }, []);

    const res = await service.getProfitability(5, {});

    expect(res.allocations).toBeUndefined();
    expect(res.allocatedTotal).toBeUndefined();
  });
});
