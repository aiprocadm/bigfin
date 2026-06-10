// © 2026 Bigfin
import { GetPayrollTaxesSummaryService } from './GetPayrollTaxesSummary.service';

describe('GetPayrollTaxesSummaryService', () => {
  it('группирует проведённые начисления по месяцам', async () => {
    const runs = [
      {
        periodMonth: '2026-05-01',
        lines: [{ ndflAmount: 13000, contributionsAmount: 30000, netAmount: 0, totalCost: 0 }],
      },
      {
        periodMonth: '2026-06-01',
        lines: [{ ndflAmount: 6500, contributionsAmount: 15000, netAmount: 0, totalCost: 0 }],
      },
    ];
    const chain: any = {
      withGraphFetched: () => chain,
      orderBy: () => Promise.resolve(runs),
    };
    chain.modify = jest.fn().mockReturnValue(chain);
    const runModel = () => ({ query: () => chain });

    const service = new GetPayrollTaxesSummaryService(runModel as any);
    const summary = await service.getSummary(2026);

    expect(chain.modify).toHaveBeenCalledWith('approvedOnly');
    expect(chain.modify).toHaveBeenCalledWith('filterByYear', 2026);
    expect(summary).toEqual([
      { month: '2026-05', ndfl: 13000, contributions: 30000, total: 43000 },
      { month: '2026-06', ndfl: 6500, contributions: 15000, total: 21500 },
    ]);
  });
});
