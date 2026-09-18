// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import type { PlanFactData } from './planFactColumns';
import { isVarianceGood, planFactSummaryRows } from './planFactSummary';

const data: PlanFactData = {
  available: true,
  budgetName: 'Бюджет 2026',
  accounts: [],
  totals: {
    income: {
      plan: 1_000_000,
      fact: 900_000,
      varianceAbs: -100_000,
      variancePct: -10,
    },
    expense: {
      plan: 700_000,
      fact: 760_000,
      varianceAbs: 60_000,
      variancePct: 8.57,
    },
  },
};

describe('planFactSummaryRows', () => {
  it('две строки: поступления и выплаты', () => {
    expect(planFactSummaryRows(data).map((row) => row.side)).toEqual([
      'income',
      'expense',
    ]);
  });

  it('сторона без плана и без факта не показывается', () => {
    // Строка из нулей утверждала бы, что ничего не планировали
    // и ничего не случилось. Это разные вещи.
    const onlyIncome: PlanFactData = {
      ...data,
      totals: {
        income: data.totals.income,
        expense: { plan: 0, fact: 0, varianceAbs: 0, variancePct: null },
      },
    };

    expect(planFactSummaryRows(onlyIncome).map((row) => row.side)).toEqual([
      'income',
    ]);
  });

  it('сторона с фактом, но без плана показывается', () => {
    // Потратили там, где не планировали, — это как раз то, что важно видеть.
    const unplanned: PlanFactData = {
      ...data,
      totals: {
        income: { plan: 0, fact: 0, varianceAbs: 0, variancePct: null },
        expense: {
          plan: 0,
          fact: 50_000,
          varianceAbs: 50_000,
          variancePct: null,
        },
      },
    };

    expect(planFactSummaryRows(unplanned).map((row) => row.side)).toEqual([
      'expense',
    ]);
  });

  it('без бюджета сводки нет вовсе', () => {
    expect(planFactSummaryRows({ ...data, available: false })).toEqual([]);
    expect(planFactSummaryRows(undefined)).toEqual([]);
  });

  it('у поступлений и выплат разные подписи', () => {
    const [income, expense] = planFactSummaryRows(data);
    expect(income.labelKey).not.toBe(expense.labelKey);
  });
});

describe('isVarianceGood — что считать хорошим', () => {
  it('получить больше плана — хорошо', () => {
    expect(isVarianceGood('income', 100_000)).toBe(true);
  });

  it('получить меньше плана — плохо', () => {
    expect(isVarianceGood('income', -100_000)).toBe(false);
  });

  it('потратить больше плана — плохо', () => {
    // Раскраска по одному лишь знаку числа красила бы перерасход зелёным.
    expect(isVarianceGood('expense', 60_000)).toBe(false);
  });

  it('потратить меньше плана — хорошо', () => {
    expect(isVarianceGood('expense', -60_000)).toBe(true);
  });

  it('точно по плану — ни хорошо, ни плохо', () => {
    expect(isVarianceGood('income', 0)).toBeNull();
    expect(isVarianceGood('expense', 0)).toBeNull();
  });
});
