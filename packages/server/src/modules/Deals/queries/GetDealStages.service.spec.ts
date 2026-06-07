// © 2026 Bigfin
import { GetDealStagesService } from './GetDealStages.service';

describe('GetDealStagesService', () => {
  const stages = [
    { id: 1, dealId: 7, name: 'Проект', plannedRevenue: 100, plannedCost: 40, status: 'closed', closedDate: '2026-03-10', sortOrder: 0 },
    { id: 2, dealId: 7, name: 'Стройка', plannedRevenue: 400, plannedCost: 300, status: 'open', closedDate: null, sortOrder: 1 },
  ];
  // stageModel().query().modify(...).orderBy(...) must resolve to `stages` (thenable).
  const stageModel = () => ({
    query: () => ({ modify: () => ({ orderBy: () => Promise.resolve(stages) }) }),
  });
  const rollup = {
    getRollup: async () => [
      { id: 10, name: 'Выручка', kind: 'income', amount: 120, parentId: null },
      { id: 20, name: 'Расходы', kind: 'expense', amount: 30, parentId: null },
    ],
  };

  it('returns ordered stages and a summary with plan/recognized/progress/fact', async () => {
    const svc = new GetDealStagesService(rollup as any, stageModel as any);
    const res = await svc.getForDeal(7, {});
    expect(res.stages).toHaveLength(2);
    expect(res.summary.planned).toEqual({ revenue: 500, costs: 340, profit: 160 });
    expect(res.summary.recognized).toEqual({ revenue: 100, costs: 40, profit: 60 });
    expect(res.summary.progress).toBeCloseTo(100 / 500);
    expect(res.summary.fact).toEqual({ revenue: 120, costs: 30, profit: 90 });
  });
});
