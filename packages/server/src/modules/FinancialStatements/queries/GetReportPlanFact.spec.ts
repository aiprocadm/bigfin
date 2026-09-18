// © 2026 Bigfin
import {
  GetReportPlanFactService,
  attributePlanToAccounts,
  withoutDoubleCountedPlans,
} from './GetReportPlanFact.service';

/**
 * Этап 4 ТЗ, п. 4.4. Колонки «План» и «Отклонение» в отчёте.
 *
 * Тонкое место здесь одно и оно не про арифметику: **план живёт на статье,
 * а строки отчёта — счета**. Одна статья («Аренда») может собирать несколько
 * счетов. Приписать её план одному из них — значит выдумать число, которого
 * никто не планировал, и человек станет принимать решения по выдумке.
 *
 * Поэтому правило жёсткое: план кладётся на строку счёта только когда счёт
 * у статьи единственный. Во всех прочих случаях план идёт лишь в итог по
 * виду — там он сходится честно.
 */

const buildService = (options: {
  budget?: any;
  lines?: any[];
  articles?: any[];
  map?: any[];
  sums?: any[];
  accounts?: any[];
}) => {
  const budgetModel = () => {
    const chain: any = {
      where: () => chain,
      orderBy: () => chain,
      first: async () => options.budget ?? null,
    };
    return { query: () => chain };
  };

  const budgetLineModel = () => {
    const chain: any = {
      where: () => chain,
      then: (resolve: any) => resolve(options.lines ?? []),
    };
    return { query: () => chain };
  };

  const articleModel = () => ({
    query: async () => options.articles ?? [],
  });

  const articleAccountModel = () => ({
    query: async () => options.map ?? [],
  });

  const accountModel = () => {
    const chain: any = {
      whereIn: async () => options.accounts ?? [],
    };
    return { query: () => chain };
  };

  const transactionModel = () => {
    const chain: any = {
      select: () => chain,
      sum: () => chain,
      where: () => chain,
      groupBy: async () => options.sums ?? [],
    };
    return { query: () => chain };
  };

  return new GetReportPlanFactService(
    budgetModel as any,
    budgetLineModel as any,
    articleModel as any,
    articleAccountModel as any,
    accountModel as any,
    transactionModel as any,
  );
};

describe('withoutDoubleCountedPlans — план не считается дважды', () => {
  it('план на группе отменяет планы статей внутри неё', () => {
    // Иначе итог «План» удвоится там, где бюджет заполнен подробнее всего.
    const kept = withoutDoubleCountedPlans([
      { id: 1, parentId: null, kind: 'expense', plan: 300_000 },
      { id: 2, parentId: 1, kind: 'expense', plan: 200_000 },
      { id: 3, parentId: 1, kind: 'expense', plan: 100_000 },
    ]);

    expect(kept.map((a) => a.id)).toEqual([1]);
  });

  it('без плана на группе считаются статьи внутри неё', () => {
    const kept = withoutDoubleCountedPlans([
      { id: 1, parentId: null, kind: 'expense', plan: 0 },
      { id: 2, parentId: 1, kind: 'expense', plan: 200_000 },
      { id: 3, parentId: 1, kind: 'expense', plan: 100_000 },
    ]);

    expect(kept.map((a) => a.id)).toEqual([2, 3]);
  });

  it('кольцо в родителях не вешает подсчёт', () => {
    // Справочник правят руками; зацикленная ссылка не должна вешать отчёт.
    const kept = withoutDoubleCountedPlans([
      { id: 1, parentId: 2, kind: 'expense', plan: 10 },
      { id: 2, parentId: 1, kind: 'expense', plan: 0 },
    ]);

    expect(kept.map((a) => a.id)).toEqual([1]);
  });
});

describe('attributePlanToAccounts — план по строкам отчёта', () => {
  it('статья с единственным счётом кладёт план на его строку', () => {
    const { accounts } = attributePlanToAccounts(
      [{ id: 10, parentId: null, kind: 'expense', plan: 120_000 }],
      [{ articleId: 10, accountId: 55 }],
      new Map([[55, 150_000]]),
    );

    expect(accounts).toEqual([
      {
        accountId: 55,
        plan: 120_000,
        fact: 150_000,
        // Перерасход: потратили на 30 000 больше плана.
        varianceAbs: 30_000,
        variancePct: 25,
      },
    ]);
  });

  it('статья на несколько счетов не приписывает план ни одному из них', () => {
    // Дробить план между счетами нечем: пропорции никто не задавал.
    const { accounts, totals } = attributePlanToAccounts(
      [{ id: 10, parentId: null, kind: 'expense', plan: 120_000 }],
      [
        { articleId: 10, accountId: 55 },
        { articleId: 10, accountId: 56 },
      ],
      new Map([
        [55, 70_000],
        [56, 40_000],
      ]),
    );

    expect(accounts).toEqual([]);
    // Но в итоге по расходам он есть — там сходится честно.
    expect(totals.expense.plan).toBe(120_000);
    expect(totals.expense.fact).toBe(110_000);
  });

  it('итог сравнивает план и факт одних и тех же статей', () => {
    // Иначе сравнивали бы план по бюджету с фактом по всему учёту —
    // и отклонение показывало бы разницу охватов, а не работы.
    const { totals } = attributePlanToAccounts(
      [
        { id: 1, parentId: null, kind: 'income', plan: 1_000_000 },
        { id: 2, parentId: null, kind: 'expense', plan: 700_000 },
      ],
      [
        { articleId: 1, accountId: 70 },
        { articleId: 2, accountId: 55 },
      ],
      new Map([
        [70, 900_000],
        [55, 700_000],
        // Счёт вне бюджета в итог не попадает.
        [99, 500_000],
      ]),
    );

    expect(totals.income.fact).toBe(900_000);
    expect(totals.income.varianceAbs).toBe(-100_000);
    expect(totals.expense.varianceAbs).toBe(0);
  });

  it('статья без счетов попадает только в итог', () => {
    const { accounts, totals } = attributePlanToAccounts(
      [{ id: 9, parentId: null, kind: 'income', plan: 50_000 }],
      [],
    );

    expect(accounts).toEqual([]);
    expect(totals.income.plan).toBe(50_000);
  });
});

describe('GetReportPlanFactService', () => {
  it('без бюджета на год отчёт остаётся прежним', async () => {
    const service = buildService({ budget: null });

    const result = await service.getPlanFact(
      'profit_loss',
      '2026-01-01',
      '2026-12-31',
    );

    expect(result.available).toBe(false);
    expect(result.accounts).toEqual([]);
  });

  it('бюджет есть, но строк за период нет — колонок не будет', async () => {
    // Пустая колонка «План» из нулей хуже отсутствия: она утверждает,
    // что план равен нулю, хотя его просто не заводили.
    const service = buildService({
      budget: { id: 1, name: 'Бюджет 2026', activeScenario: 'base' },
      lines: [],
    });

    const result = await service.getPlanFact(
      'profit_loss',
      '2026-01-01',
      '2026-03-31',
    );

    expect(result.available).toBe(false);
  });

  it('факт считается стороной счёта, а не сложением дебета с кредитом', async () => {
    // Доход лежит в кредите, расход — в дебете. Сложить «как есть» значит
    // показать перерасход там, где его нет.
    const service = buildService({
      budget: { id: 1, name: 'Бюджет 2026', activeScenario: 'base' },
      lines: [
        { articleId: 10, plannedAmount: 100_000 },
        { articleId: 10, plannedAmount: 20_000 },
        { articleId: 11, plannedAmount: 900_000 },
      ],
      articles: [
        { id: 10, parentId: null, kind: 'expense' },
        { id: 11, parentId: null, kind: 'income' },
      ],
      map: [
        { articleId: 10, accountId: 55 },
        { articleId: 11, accountId: 70 },
      ],
      accounts: [
        { id: 55, accountNormal: 'debit' },
        { id: 70, accountNormal: 'credit' },
      ],
      sums: [
        // Расход: дебет минус кредит (был возврат поставщика на 5 000).
        { accountId: 55, debitSum: 130_000, creditSum: 5_000 },
        // Доход: кредит минус дебет.
        { accountId: 70, debitSum: 0, creditSum: 950_000 },
      ],
    });

    const result = await service.getPlanFact(
      'profit_loss',
      '2026-01-01',
      '2026-03-31',
    );

    expect(result.available).toBe(true);
    expect(result.budgetName).toBe('Бюджет 2026');
    expect(result.accounts).toEqual([
      // Две строки бюджета по одной статье складываются: 100 000 + 20 000.
      {
        accountId: 55,
        plan: 120_000,
        fact: 125_000,
        varianceAbs: 5_000,
        variancePct: 4.17,
      },
      {
        accountId: 70,
        plan: 900_000,
        fact: 950_000,
        varianceAbs: 50_000,
        variancePct: 5.56,
      },
    ]);
  });

  it('год берётся из начала периода отчёта', async () => {
    // Отчёт за январь 2026 не должен подтягивать бюджет 2025 года.
    const seen: any = {};
    const budgetModel = () => {
      const chain: any = {
        where: (column: string, value: any) => {
          seen[column] = value;
          return chain;
        },
        orderBy: () => chain,
        first: async () => null,
      };
      return { query: () => chain };
    };

    const stub = () => ({ query: async () => [] });

    const service = new GetReportPlanFactService(
      budgetModel as any,
      (() => ({ query: () => ({}) })) as any,
      stub as any,
      stub as any,
      stub as any,
      stub as any,
    );

    await service.getPlanFact('cash_flow', '2026-01-01', '2026-01-31');

    expect(seen.fiscalYear).toBe(2026);
    // ДДС спрашивает бюджет движения денег, а не бюджет прибыли.
    expect(seen.type).toBe('bdds');
  });
});
