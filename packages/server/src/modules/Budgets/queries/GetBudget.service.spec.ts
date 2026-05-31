import { GetBudgetService } from './GetBudget.service';

describe('GetBudgetService', () => {
  it('returns the budget with its lines', async () => {
    const budget = { id: 1, name: 'Бюджет 2026', type: 'bdir' };
    const budgetModel = () => ({
      query: () => ({
        findById: () => ({
          withGraphFetched: () =>
            Promise.resolve({ ...budget, lines: [{ id: 9 }] }),
        }),
      }),
    });
    const service = new GetBudgetService(budgetModel as any);
    const res = await service.getBudget(1);
    expect(res.id).toBe(1);
    expect((res as any).lines).toHaveLength(1);
  });
});
