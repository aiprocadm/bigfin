import { mergePlanFactScenarios } from './mergePlanFactScenarios';

describe('mergePlanFactScenarios', () => {
  it('merges three scenarios for one article (fact != 0)', () => {
    const rows = mergePlanFactScenarios({
      optimistic: [{ articleId: 1, name: 'Выручка', plan: 1500000, fact: 1200000 }],
      realistic: [{ articleId: 1, name: 'Выручка', plan: 1250000, fact: 1200000 }],
      pessimistic: [{ articleId: 1, name: 'Выручка', plan: 1000000, fact: 1200000 }],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      articleId: 1,
      name: 'Выручка',
      fact: 1200000,
      plans: { optimistic: 1500000, realistic: 1250000, pessimistic: 1000000 },
      deviations: { optimistic: 25, realistic: 4, pessimistic: -17 },
      closest: 'realistic',
    });
  });

  it('treats a missing article in a scenario as plan 0', () => {
    const rows = mergePlanFactScenarios({
      optimistic: [],
      realistic: [{ articleId: 2, name: 'Аренда', plan: 180000, fact: 180000 }],
      pessimistic: [],
    });

    expect(rows[0].plans).toEqual({
      optimistic: 0,
      realistic: 180000,
      pessimistic: 0,
    });
    expect(rows[0].closest).toBe('realistic');
    expect(rows[0].deviations).toEqual({
      optimistic: -100,
      realistic: 0,
      pessimistic: -100,
    });
  });

  it('returns null deviations and no highlight when fact is 0', () => {
    const rows = mergePlanFactScenarios({
      optimistic: [{ articleId: 3, name: 'Новая', plan: 5000, fact: 0 }],
      realistic: [{ articleId: 3, name: 'Новая', plan: 4000, fact: 0 }],
      pessimistic: [{ articleId: 3, name: 'Новая', plan: 3000, fact: 0 }],
    });

    expect(rows[0].deviations).toEqual({
      optimistic: null,
      realistic: null,
      pessimistic: null,
    });
    expect(rows[0].closest).toBeNull();
  });

  it('resolves a closest tie by scenario order (optimistic first)', () => {
    const rows = mergePlanFactScenarios({
      optimistic: [{ articleId: 4, name: 'X', plan: 80, fact: 100 }],
      realistic: [{ articleId: 4, name: 'X', plan: 120, fact: 100 }],
      pessimistic: [{ articleId: 4, name: 'X', plan: 80, fact: 100 }],
    });

    expect(rows[0].closest).toBe('optimistic');
  });

  it('returns an empty array for empty input', () => {
    expect(
      mergePlanFactScenarios({ optimistic: [], realistic: [], pessimistic: [] }),
    ).toEqual([]);
  });
});
