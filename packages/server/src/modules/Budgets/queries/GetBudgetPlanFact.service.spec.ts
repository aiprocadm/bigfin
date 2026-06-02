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

  // Регрессия согласованности (спека §5.4, критерий приёмки №4): «факт» БДиР
  // план-факта обязан совпадать с ОПиУ по статьям за тот же период — оба
  // источника берут один и тот же ArticlesPlRollup. Тест ловит будущую
  // регрессию, при которой отчёт перестанет быть точным проходом роллапа
  // (например, начнёт терять статьи, у которых есть факт, но нет плана).
  it('keeps БДиР «факт» consistent with the ОПиУ-by-articles rollup (spec §5.4)', async () => {
    const budget = { id: 7, type: 'bdir', activeScenario: 'realistic' };
    const budgetModel = () => ({
      query: () => ({ findById: () => Promise.resolve(budget) }),
    });
    // План задан только для части статей — факт не должен от этого зависеть.
    const lineModel = () => ({
      query: () => ({
        onBuild: () =>
          Promise.resolve([
            { articleId: 11, plannedAmount: 500000 },
            { articleId: 21, plannedAmount: 150000 },
          ]),
      }),
    });

    // Канонический ОПиУ по статьям за период (то, что вернул бы отчёт ОПиУ):
    // доходы/расходы с родителями, несущими сумму поддерева.
    const opiuByArticles = [
      { id: 10, name: 'Доходы', kind: 'income', parentId: null, amount: 540000 },
      { id: 11, name: 'Выручка', kind: 'income', parentId: 10, amount: 540000 },
      { id: 20, name: 'Расходы', kind: 'expense', parentId: null, amount: 470000 },
      { id: 21, name: 'Аренда', kind: 'expense', parentId: 20, amount: 150000 },
      { id: 22, name: 'ФОТ', kind: 'expense', parentId: 20, amount: 320000 },
    ];
    const plRollup = {
      getRollup: jest.fn().mockResolvedValue(opiuByArticles),
    };
    const cashRollup = { getRollup: jest.fn() };

    const service = new GetBudgetPlanFactService(
      budgetModel as any,
      lineModel as any,
      plRollup as any,
      cashRollup as any,
    );

    const query = {
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
      branchesIds: [3],
    };
    const res = await service.getPlanFact(7, query as any);

    // 1) Факт берётся из того же ОПиУ-роллапа за тот же период и направление.
    expect(plRollup.getRollup).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
        branchesIds: [3],
      }),
    );

    // 2) Ни одна статья ОПиУ не теряется в план-факте.
    expect(res.rows).toHaveLength(opiuByArticles.length);

    // 3) «Факт» каждой статьи в точности равен её сумме в ОПиУ по статьям.
    opiuByArticles.forEach((opiuRow) => {
      const row = res.rows.find((r: any) => r.articleId === opiuRow.id);
      expect(row).toMatchObject({ articleId: opiuRow.id, fact: opiuRow.amount });
    });
  });
});
