// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  formatVariance,
  planFactForRow,
  type PlanFactData,
} from './planFactColumns';

const data: PlanFactData = {
  available: true,
  budgetName: 'Бюджет 2026',
  accounts: [
    {
      accountId: 55,
      plan: 120_000,
      fact: 125_000,
      varianceAbs: 5_000,
      variancePct: 4.17,
    },
  ],
  totals: {
    income: {
      plan: 1_000_000,
      fact: 900_000,
      varianceAbs: -100_000,
      variancePct: -10,
    },
    expense: { plan: 700_000, fact: 700_000, varianceAbs: 0, variancePct: 0 },
  },
};

describe('planFactForRow — какой строке принадлежит план', () => {
  it('строка счёта берёт свой план', () => {
    expect(planFactForRow({ id: 55 }, data)).toEqual({
      accountId: 55,
      plan: 120_000,
      fact: 125_000,
      varianceAbs: 5_000,
      variancePct: 4.17,
    });
  });

  it('счёт без плана получает прочерк, а не ноль', () => {
    // Ноль утверждал бы, что планировали ничего не заработать.
    expect(planFactForRow({ id: 56 }, data)).toBeNull();
  });

  it('итог «Выручка» берёт план доходов, «Расходы» — расходов', () => {
    expect(planFactForRow({ id: 'INCOME' }, data)?.plan).toBe(1_000_000);
    expect(planFactForRow({ id: 'EXPENSES' }, data)?.plan).toBe(700_000);
  });

  it('расчётные строки плана не получают', () => {
    // У «Чистой прибыли» и «Валовой прибыли» своего плана в бюджете нет:
    // подставить туда чужой — значит сочинить.
    expect(planFactForRow({ id: 'NET_INCOME' }, data)).toBeNull();
    expect(planFactForRow({ id: 'GROSS_PROFIT' }, data)).toBeNull();
  });

  it('без бюджета колонок нет вовсе', () => {
    const empty = { ...data, available: false };
    expect(planFactForRow({ id: 55 }, empty)).toBeNull();
    expect(planFactForRow({ id: 'INCOME' }, empty)).toBeNull();
  });

  it('строка без номера не роняет отчёт', () => {
    expect(planFactForRow({}, data)).toBeNull();
    expect(planFactForRow({ id: 55 }, undefined)).toBeNull();
  });
});

describe('formatVariance', () => {
  const money = (value: number) => `${value} ₽`;

  it('перерасход показывается с плюсом у доли', () => {
    expect(formatVariance(5_000, 4.17, money)).toBe('5000 ₽ (+4.17%)');
  });

  it('недобор сохраняет минус', () => {
    expect(formatVariance(-100_000, -10, money)).toBe('-100000 ₽ (-10%)');
  });

  it('без плана доля не показывается', () => {
    // Делить на ноль нечем, а «∞%» ничего не объясняет.
    expect(formatVariance(5_000, null, money)).toBe('5000 ₽');
  });
});
