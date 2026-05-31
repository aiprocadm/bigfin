import { GetBudgetPlanFactService } from './GetBudgetPlanFact.service';

describe('GetBudgetPlanFactService', () => {
  it('joins plan and fact (БДиР via P&L rollup) with variance', async () => {
    const budget = { id: 1, type: 'bdir', activeScenario: 'realistic' };
    const budgetModel = () => ({
      query: () => ({ findById: () => Promise.resolve(budget) }),
    });
    // План: статья 1 = 540000.
    const lineModel = () => ({
      query: () => ({
        onBuild: () =>
          Promise.resolve([{ articleId: 1, plannedAmount: 540000 }]),
      }),
    });
    // Факт P&L: статья 1 = 512000.
    const plRollup = {
      getRollup: jest
        .fn()
        .mockResolvedValue([
          { id: 1, name: 'Выручка', kind: 'income', amount: 512000 },
        ]),
    };
    const cashRollup = { getRollup: jest.fn() };

    const service = new GetBudgetPlanFactService(
      budgetModel as any,
      lineModel as any,
      plRollup as any,
      cashRollup as any,
    );

    const res = await service.getPlanFact(1, {
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    } as any);

    expect(plRollup.getRollup).toHaveBeenCalled();
    expect(cashRollup.getRollup).not.toHaveBeenCalled();
    const row = res.rows.find((r: any) => r.articleId === 1);
    expect(row).toMatchObject({ plan: 540000, fact: 512000, varianceAbs: -28000 });
  });

  it('uses the cash rollup for БДДС budgets', async () => {
    const budgetModel = () => ({
      query: () => ({
        findById: () =>
          Promise.resolve({ id: 2, type: 'bdds', activeScenario: 'realistic' }),
      }),
    });
    const lineModel = () => ({
      query: () => ({ onBuild: () => Promise.resolve([]) }),
    });
    const plRollup = { getRollup: jest.fn() };
    const cashRollup = { getRollup: jest.fn().mockResolvedValue([]) };

    const service = new GetBudgetPlanFactService(
      budgetModel as any,
      lineModel as any,
      plRollup as any,
      cashRollup as any,
    );
    await service.getPlanFact(2, {
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    } as any);

    expect(cashRollup.getRollup).toHaveBeenCalled();
    expect(plRollup.getRollup).not.toHaveBeenCalled();
  });
});
