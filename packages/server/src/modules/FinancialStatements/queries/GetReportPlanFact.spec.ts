// © 2026 Bigfin
import {
  BUDGET_TYPE_BY_REPORT,
  GetReportPlanFactService,
  attributePlanToAccounts,
  withoutDoubleCountedPlans,
} from './GetReportPlanFact.service';
import { BUDGET_TYPES } from '@/modules/Budgets/constants';

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
  /** Узлы отчёта ОПиУ — теперь именно они и есть факт (остаток О4). */
  reportNodes?: any[];
  /** Узлы того же отчёта по оплате: по кассовому методу числа другие. */
  cashReportNodes?: any[];
  /** Тест может подсмотреть, с чем позвали отчёт. */
  spy?: any;
  budget?: any;
  lines?: any[];
  articles?: any[];
  map?: any[];
  sums?: any[];
  accounts?: any[];
  legs?: any[];
  cashAccounts?: any[];
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
    // Кассовый факт сначала спрашивает денежные счета по типу,
    // потом — счета из полученных сумм по номерам.
    const chain: any = {
      whereIn: async (column: string) =>
        column === 'accountType'
          ? options.cashAccounts ?? []
          : options.accounts ?? [],
    };
    return { query: () => chain };
  };

  const transactionModel = () => {
    const chain: any = {
      select: () => chain,
      sum: () => chain,
      where: () => chain,
      groupBy: async () => options.sums ?? [],
      // Кассовый факт берёт проводки списком, без группировки.
      then: (resolve: any) => resolve(options.legs ?? []),
    };
    return { query: () => chain };
  };

  /**
   * Подставной отчёт ОПиУ.
   *
   * Факт теперь спрашивается у самого отчёта (остаток О4 ТЗ), поэтому
   * заглушка запоминает, с каким методом учёта её позвали: именно это и
   * проверяется — колонка «Отклонение» обязана считать тем же методом,
   * каким посчитан отчёт на экране.
   */
  const profitLoss = {
    lastFilter: null as any,
    profitLossSheet: async (filter: any) => {
      profitLoss.lastFilter = filter;

      const nodes =
        filter?.basis === 'cash'
          ? options.cashReportNodes ?? options.reportNodes ?? []
          : options.reportNodes ?? [];

      return { data: nodes };
    },
  };

  // Тест может подсмотреть, с чем отчёт позвали.
  if (options.spy) options.spy.profitLoss = profitLoss;

  return new GetReportPlanFactService(
    profitLoss as any,
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

  it('факт берётся из самого отчёта, а не считается вторым способом', async () => {
    // Остаток О4 ТЗ. Свой подсчёт совпадал с отчётом только по начислению;
    // по оплате отчёт показывает совсем другое, и колонка «Отклонение»
    // сравнивала план с числом, которого на экране нет.
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
      reportNodes: [
        {
          id: 'EXPENSES',
          total: { amount: 125_000 },
          children: [{ id: 55, total: { amount: 125_000 } }],
        },
        {
          id: 'INCOME',
          total: { amount: 950_000 },
          children: [{ id: 70, total: { amount: 950_000 } }],
        },
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

  it('итоги и расчётные строки отчёта в факт не попадают', async () => {
    // У «INCOME» и «NET_INCOME» своих проводок нет, номер у них словом.
    // Считать их значило бы удвоить факт.
    const service = buildService({
      budget: { id: 1, name: 'Бюджет 2026', activeScenario: 'base' },
      lines: [{ articleId: 11, plannedAmount: 900_000 }],
      articles: [{ id: 11, parentId: null, kind: 'income' }],
      map: [{ articleId: 11, accountId: 70 }],
      reportNodes: [
        {
          id: 'INCOME',
          total: { amount: 950_000 },
          children: [{ id: 70, total: { amount: 950_000 } }],
        },
        { id: 'NET_INCOME', total: { amount: 500_000 } },
      ],
    });

    const result = await service.getPlanFact(
      'profit_loss',
      '2026-01-01',
      '2026-03-31',
    );

    expect(result.totals.income.fact).toBe(950_000);
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
      { profitLossSheet: async () => ({ data: [] }) } as any,
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

describe('тип бюджета по отчёту', () => {
  it('названия типов взяты из общего списка, а не написаны на глаз', () => {
    // Опечатка в этой строке ничего не ломает вслух: сервер не найдёт
    // бюджет и ответит «бюджета нет», а колонки молча не появятся.
    // Именно так и случилось в первой версии («bdr» вместо «bdir»).
    const known = new Set<string>(BUDGET_TYPES as unknown as string[]);

    expect(known.has(BUDGET_TYPE_BY_REPORT.profit_loss)).toBe(true);
    expect(known.has(BUDGET_TYPE_BY_REPORT.cash_flow)).toBe(true);
  });

  it('прибыль и деньги спрашивают разные бюджеты', () => {
    expect(BUDGET_TYPE_BY_REPORT.profit_loss).not.toBe(
      BUDGET_TYPE_BY_REPORT.cash_flow,
    );
  });
});

describe('кассовый факт для движения денег', () => {
  const budget = { id: 1, name: 'Бюджет 2026', activeScenario: 'base' };
  const lines = [{ articleId: 10, plannedAmount: 100_000 }];
  const articles = [{ id: 10, parentId: null, kind: 'expense' }];
  const map = [{ articleId: 10, accountId: 55 }];
  const accounts = [{ id: 55, accountNormal: 'debit' }];
  const cashAccounts = [{ id: 1, accountType: 'bank' }];

  it('неоплаченный счёт в факт не попадает', async () => {
    // Операция не задела ни один денежный счёт: деньги не двигались.
    const service = buildService({
      budget,
      lines,
      articles,
      map,
      accounts,
      cashAccounts,
      legs: [
        {
          referenceType: 'Bill',
          referenceId: 7,
          accountId: 55,
          debit: 80_000,
          credit: 0,
        },
        {
          referenceType: 'Bill',
          referenceId: 7,
          accountId: 90,
          debit: 0,
          credit: 80_000,
        },
      ],
    });

    const result = await service.getPlanFact(
      'cash_flow',
      '2026-01-01',
      '2026-03-31',
    );

    expect(result.totals.expense.fact).toBe(0);
  });

  it('оплаченный счёт попадает в факт', async () => {
    const service = buildService({
      budget,
      lines,
      articles,
      map,
      accounts,
      cashAccounts,
      legs: [
        {
          referenceType: 'Payment',
          referenceId: 9,
          accountId: 55,
          debit: 80_000,
          credit: 0,
        },
        // Вторая нога — на банковском счёте: деньги реально ушли.
        {
          referenceType: 'Payment',
          referenceId: 9,
          accountId: 1,
          debit: 0,
          credit: 80_000,
        },
      ],
    });

    const result = await service.getPlanFact(
      'cash_flow',
      '2026-01-01',
      '2026-03-31',
    );

    expect(result.totals.expense.fact).toBe(80_000);
    expect(result.totals.expense.varianceAbs).toBe(-20_000);
  });

  it('перевод между своими счетами деньгами не считается', async () => {
    // Он ничего не зарабатывает и не тратит, только перекладывает.
    const service = buildService({
      budget,
      lines,
      articles,
      map,
      accounts,
      cashAccounts,
      legs: [
        {
          referenceType: 'Transfer',
          referenceId: 3,
          accountId: 55,
          debit: 80_000,
          credit: 0,
          transactionType: 'TransferToAccount',
        },
        {
          referenceType: 'Transfer',
          referenceId: 3,
          accountId: 1,
          debit: 0,
          credit: 80_000,
          transactionType: 'TransferToAccount',
        },
      ],
    });

    const result = await service.getPlanFact(
      'cash_flow',
      '2026-01-01',
      '2026-03-31',
    );

    expect(result.totals.expense.fact).toBe(0);
  });
});

describe('метод учёта колонки «Отклонение» (остаток О4)', () => {
  const budgetOptions = {
    budget: { id: 1, name: 'Бюджет 2026', activeScenario: 'base' },
    lines: [{ articleId: 11, plannedAmount: 900_000 }],
    articles: [{ id: 11, parentId: null, kind: 'income' }],
    map: [{ articleId: 11, accountId: 70 }],
    reportNodes: [
      {
        id: 'INCOME',
        total: { amount: 950_000 },
        children: [{ id: 70, total: { amount: 950_000 } }],
      },
    ],
    // По оплате в отчёт попадает только оплаченное — это другое число.
    cashReportNodes: [
      {
        id: 'INCOME',
        total: { amount: 400_000 },
        children: [{ id: 70, total: { amount: 400_000 } }],
      },
    ],
  };

  it('метод учёта доходит до отчёта', async () => {
    const spy: any = {};
    const service = buildService({ ...budgetOptions, spy });

    await service.getPlanFact('profit_loss', '2026-01-01', '2026-03-31', 'cash');

    expect(spy.profitLoss.lastFilter.basis).toBe('cash');
  });

  it('по оплате факт другой, чем по начислению', async () => {
    // Ради этого остаток и заводили: колонка сравнивала план с фактом по
    // начислению даже тогда, когда отчёт был переключён на оплату.
    const service = buildService(budgetOptions);

    const accrual = await service.getPlanFact(
      'profit_loss',
      '2026-01-01',
      '2026-03-31',
      'accrual',
    );
    const cash = await service.getPlanFact(
      'profit_loss',
      '2026-01-01',
      '2026-03-31',
      'cash',
    );

    expect(accrual.accounts[0].fact).toBe(950_000);
    expect(cash.accounts[0].fact).toBe(400_000);
  });

  it('без метода учёта отчёт спрашивается как есть', async () => {
    // Умолчание живёт в самом отчёте, а не повторяется здесь вторым местом.
    const spy: any = {};
    const service = buildService({ ...budgetOptions, spy });

    await service.getPlanFact('profit_loss', '2026-01-01', '2026-03-31');

    expect(spy.profitLoss.lastFilter.basis).toBeUndefined();
  });

  it('отклонение считается от факта отчёта, а не от своего', async () => {
    const service = buildService(budgetOptions);

    const cash = await service.getPlanFact(
      'profit_loss',
      '2026-01-01',
      '2026-03-31',
      'cash',
    );

    // План 900 000, факт по оплате 400 000 — недобор 500 000.
    expect(cash.accounts[0].varianceAbs).toBe(-500_000);
  });
});
