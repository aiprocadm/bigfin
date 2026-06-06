import { GetDealProfitabilityService } from './GetDealProfitability.service';

describe('GetDealProfitabilityService', () => {
  const makeService = (deal: any) => {
    const rollup = {
      getRollup: jest.fn().mockResolvedValue([
        { id: 1, name: 'Доходы', kind: 'income', parentId: null, amount: 600 },
        { id: 2, name: 'Расходы', kind: 'expense', parentId: null, amount: 390 },
      ]),
    };
    const dealModel = () => ({
      query: () => ({ findById: () => Promise.resolve(deal) }),
    });
    const service = new GetDealProfitabilityService(
      rollup as any,
      dealModel as any,
    );
    return { service, rollup };
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
});
