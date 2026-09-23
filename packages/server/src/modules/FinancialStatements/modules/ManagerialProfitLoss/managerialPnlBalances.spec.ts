// © 2026 Bigfin
import { ArticlesCashflowRollupService, legDate } from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { ManagerialPnlService } from './ManagerialPnlService';
import { ManagerialPnlSourceService } from './ManagerialPnlSource.service';
import { ManagerialPnlTable } from './ManagerialPnlTable';

/**
 * Управленческий ОПиУ целиком (FT-010 ТЗ-3): служба, настоящие расчёты,
 * «база» в памяти, 1 000 случайных операций (критерий приёмки 2).
 *
 * Критерий 5: сумма строк ярусов равна чистой прибыли — сторожевая
 * проверка лестницы.
 */
const ARTICLES = [
  { id: 1, name: 'Выручка', kind: 'income', parentId: null, plType: 'revenue', sortOrder: 1 },
  { id: 2, name: 'Эквайринг', kind: 'expense', parentId: null, plType: 'direct_variable', sortOrder: 2 },
  { id: 3, name: 'Материалы', kind: 'expense', parentId: null, plType: 'direct_production', sortOrder: 3 },
  { id: 4, name: 'Аренда цеха', kind: 'expense', parentId: null, plType: 'overhead_production', sortOrder: 4 },
  { id: 5, name: 'Офис', kind: 'expense', parentId: null, plType: 'administrative', sortOrder: 5 },
  { id: 6, name: 'Реклама', kind: 'expense', parentId: null, plType: 'commercial', sortOrder: 6 },
  { id: 7, name: 'Проценты банка', kind: 'income', parentId: null, plType: 'other_income_below_ebitda', sortOrder: 7 },
  { id: 8, name: 'Налог', kind: 'expense', parentId: null, plType: 'below_ebitda', sortOrder: 8 },
  { id: 9, name: 'Дивиденды', kind: 'expense', parentId: null, plType: 'below_net_profit', sortOrder: 9 },
];
// Счёт 100 + id статьи — счёт статьи; 50 — касса, 60 — расчёты с поставщиками.
const ACCOUNTS = [
  { id: 50, name: 'Касса', accountType: 'cash', accountNormal: 'debit' },
  { id: 60, name: 'Поставщики', accountType: 'accounts-payable', accountNormal: 'credit' },
  { id: 70, name: 'Покупатели', accountType: 'accounts-receivable', accountNormal: 'debit' },
  ...ARTICLES.map((a) => ({
    id: 100 + a.id,
    name: a.name,
    accountType: a.kind === 'income' ? 'income' : 'expense',
    accountNormal: a.kind === 'income' ? 'credit' : 'debit',
  })),
];
const MAP = ARTICLES.map((a) => ({ articleId: a.id, accountId: 100 + a.id }));

function prng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/** 1 000 операций за 2026 год; каждая пятая — в долг (не оплачена). */
function makeLegs() {
  const random = prng(32);
  const legs: any[] = [];
  for (let id = 1; id <= 1000; id += 1) {
    const article = ARTICLES[Math.floor(random() * ARTICLES.length)];
    const amount = Math.round(random() * 50000_00) / 100;
    const date = new Date(2026, Math.floor(random() * 12), 1 + Math.floor(random() * 28));
    const onCredit = id % 5 === 0;
    const other = onCredit ? 60 : 50;
    const base = { referenceType: 'Expense', referenceId: id, date, projectId: id % 3 === 0 ? 10 : null };
    const income = article.kind === 'income';
    legs.push({ ...base, accountId: 100 + article.id, debit: income ? 0 : amount, credit: income ? amount : 0 });
    legs.push({ ...base, accountId: other, debit: income ? amount : 0, credit: income ? 0 : amount });
  }
  // Счёт покупателю выставлен в феврале, оплачен отдельной оплатой в марте:
  // у самого счёта нет денежной ноги, у оплаты нет ноги выручки.
  const invoice = { referenceType: 'SaleInvoice', referenceId: 5001, date: new Date(2026, 1, 10), projectId: null };
  legs.push({ ...invoice, accountId: 101, debit: 0, credit: 60000 });
  legs.push({ ...invoice, accountId: 70, debit: 60000, credit: 0 });
  const payment = { referenceType: 'PaymentReceive', referenceId: 6001, date: new Date(2026, 2, 5), projectId: null };
  legs.push({ ...payment, accountId: 50, debit: 60000, credit: 0 });
  legs.push({ ...payment, accountId: 70, debit: 0, credit: 60000 });
  // Аренда офиса за декабрь 2025, оплаченная 5 января 2026 (FT-013).
  const rent = { referenceType: 'CashflowTransaction', referenceId: 7001, date: new Date(2026, 0, 5), projectId: null, accrualPeriod: '2025-12' };
  legs.push({ ...rent, accountId: 105, debit: 5000, credit: 0 });
  legs.push({ ...rent, accountId: 50, debit: 0, credit: 5000 });
  return legs;
}
const LEGS = makeLegs();

/** Группирует ноги как SQL: счёт × направление × день, в границах дат. */
function groupedQuery(build: (qb: any) => void) {
  let from = '0000-00-00';
  let to = '9999-99-99';
  let notIn: string[] = [];
  const qb: any = {
    select: () => qb,
    sum: () => qb,
    groupBy: () => qb,
    where: () => qb,
    whereIn: () => qb,
    whereNotIn: (_column: string, values: string[]) => {
      notIn = values;
      return qb;
    },
    modify: (name: string, a?: string, b?: string) => {
      if (name === 'filterDateRange') {
        if (a) from = a;
        if (b) to = b;
      }
      return qb;
    },
  };
  build(qb);
  const groups = new Map<string, any>();
  LEGS.forEach((leg) => {
    const day = legDate(leg)!;
    if (day < from || day > to) return;
    if (notIn.includes(leg.referenceType)) return;
    const key = `${leg.accountId}|${leg.projectId}|${day}|${leg.accrualPeriod ?? ''}`;
    const row = groups.get(key) ?? { accountId: leg.accountId, projectId: leg.projectId, date: day, accrualPeriod: leg.accrualPeriod ?? null, credit: 0, debit: 0 };
    row.credit += leg.credit;
    row.debit += leg.debit;
    groups.set(key, row);
  });
  return [...groups.values()];
}

function makeService(settings: Record<string, unknown> = {}) {
  const articleModel = () => ({
    query: () => ({
      whereIn: () => ({ orderBy: () => Promise.resolve(ARTICLES) }),
      orderBy: () => Promise.resolve(ARTICLES),
    }),
  });
  const articleAccountModel = () => ({ query: () => Promise.resolve(MAP) });
  const accountModel = () => ({
    query: () =>
      Object.assign(Promise.resolve(ACCOUNTS), {
        whereIn: (column: string, values: any[]) =>
          Promise.resolve(ACCOUNTS.filter((a: any) => values.includes(a[column]))),
        onBuild: () =>
          Promise.resolve(ACCOUNTS.filter((a) => ['cash', 'bank'].includes(a.accountType))),
      }),
  });
  const accountTransactionModel = () => ({
    query: () => ({
      // Строки оплачиваемых документов — для признания выручки по оплате.
      where: (_column: string, referenceType: string) => ({
        whereIn: async (_c: string, ids: number[]) =>
          LEGS.filter((leg) => leg.referenceType === referenceType && ids.includes(leg.referenceId)),
      }),
      onBuild: (build: (qb: any) => void) => {
        // Кассовая свёртка читает ноги целиком, начисление — сгруппированные.
        let grouped = false;
        const probe: any = new Proxy(
          {},
          {
            get: (_t, prop) => (...args: any[]) => {
              if (prop === 'groupBy') grouped = true;
              return probe;
            },
          },
        );
        build(probe);
        if (grouped) return Promise.resolve(groupedQuery(build));
        let from = '0000';
        let to = '9999';
        build({
          modify: (name: string, a?: string, b?: string) => {
            if (name === 'filterDateRange') {
              from = a ?? from;
              to = b ?? to;
            }
          },
          where: () => undefined,
          whereIn: () => undefined,
        });
        return Promise.resolve(
          LEGS.filter((leg) => legDate(leg)! >= from && legDate(leg)! <= to),
        );
      },
    }),
  });

  const cashRollup = new ArticlesCashflowRollupService(
    articleModel as any,
    articleAccountModel as any,
    accountModel as any,
    accountTransactionModel as any,
  );
  const paymentEntries = () => ({
    query: () => ({
      whereIn: async (_c: string, ids: number[]) =>
        ids.includes(6001)
          ? [{ paymentReceiveId: 6001, invoiceId: 5001, paymentAmount: 60000 }]
          : [],
    }),
  });
  const billEntries = () => ({ query: () => ({ whereIn: async () => [] }) });
  const source = new ManagerialPnlSourceService(
    cashRollup,
    articleModel as any,
    articleAccountModel as any,
    accountModel as any,
    accountTransactionModel as any,
    paymentEntries as any,
    billEntries as any,
  );
  return new ManagerialPnlService(
    source,
    { meta: async () => ({ dateFormat: 'DD.MM.YYYY' }) } as any,
    { t: (key: string) => key } as any,
    (() => ({ query: () => ({ whereIn: () => ({ select: async () => [{ id: 10, name: 'Кофейня' }] }) }) })) as any,
    (async () => ({
      get: ({ group, key }: { group: string; key: string }) =>
        group === 'pnl_sources' ? settings[key] : undefined,
    })) as any,
  );
}

const YEAR = { fromDate: '2026-01-01', toDate: '2026-12-31' };
const i18n = { t: (key: string) => key } as any;

/** Суммы групп колонки: ярус → сумма. */
const groups = (column: any) =>
  Object.fromEntries(
    column.rows.filter((r: any) => r.rowType === 'PL_GROUP').map((r: any) => [r.id, r.amount]),
  );

describe('управленческий ОПиУ: лестница сходится', () => {
  const service = makeService();

  it('критерий 2: ВП2 = выручка − (прямые переменные + прямые производственные + общепроизводственные)', async () => {
    const { data } = await service.sheet({ ...YEAR, dateGroup: 'month' } as any);

    [...data.periods.map((p) => p.column), data.total].forEach((column) => {
      const g = groups(column);
      expect(
        Math.abs(
          column.tiers.gp2 -
            (g.revenue - (g.direct_variable + g.direct_production + g.overhead_production)),
        ),
      ).toBeLessThan(0.01);
    });
  });

  it('критерий 5: строки ярусов в сумме дают чистую прибыль', async () => {
    const { data } = await service.sheet({ ...YEAR, dateGroup: 'quarter' } as any);

    [...data.periods.map((p) => p.column), data.total].forEach((column) => {
      const g = groups(column);
      const fromRows =
        g.revenue -
        g.direct_variable -
        g.direct_production -
        g.overhead_production -
        g.administrative -
        g.commercial +
        g.other_income_below_ebitda -
        g.below_ebitda;
      expect(Math.abs(column.tiers.np - fromRows)).toBeLessThan(0.01);
    });
  });

  it('«Итого» каждой группы и статьи = сумма колонок; рентабельность в «Итого» пересчитана', async () => {
    const { data } = await service.sheet({ ...YEAR, dateGroup: 'month' } as any);
    const table = new ManagerialPnlTable(data, i18n, { showEmpty: true });
    const rows = new Map<string, number[]>();
    const walk = (list: any[]) =>
      list.forEach((row) => {
        rows.set(row.id, row.cells.slice(1).map((c: any) => (c.value === '' ? NaN : Number(c.value))));
        walk(row.children);
      });
    walk(table.tableData());

    rows.forEach((cells, id) => {
      if (id.endsWith('_margin')) return;
      const total = cells[cells.length - 1];
      const sum = cells.slice(0, -1).reduce((s, v) => s + v, 0);
      expect(Math.abs(total - sum)).toBeLessThan(0.01);
    });
    const marginTotal = rows.get('md_margin')![12];
    expect(marginTotal).toBeCloseTo((data.total.tiers.md / data.total.amounts.revenue) * 100, 2);
  });

  it('по деньгам — неоплаченные (в долг) операции не видны, по начислению — видны', async () => {
    const accrual = (await service.sheet({ ...YEAR, dateGroup: 'total', basis: 'accrual' } as any)).data;
    const cash = (await service.sheet({ ...YEAR, dateGroup: 'total', basis: 'cash' } as any)).data;

    expect(cash.total.amounts.administrative).toBeLessThan(accrual.total.amounts.administrative);
    expect(cash.total.amounts.administrative).toBeGreaterThan(0);
  });

  it('по деньгам: счёт, оплаченный позже, даёт выручку в месяце оплаты (как бухгалтерский ОПиУ)', async () => {
    const range = { fromDate: '2026-02-01', toDate: '2026-03-31', dateGroup: 'month' };
    const cash = (await service.sheet({ ...range, basis: 'cash' } as any)).data;
    const accrual = (await service.sheet({ ...range, basis: 'accrual' } as any)).data;
    const revenueOf = (data: any, key: string) =>
      data.periods.find((p: any) => p.key === key).column.amounts.revenue;
    const cashWithout = (await makeServiceWithoutInvoice()).data;

    // По начислению — в феврале, по деньгам — в марте.
    expect(revenueOf(accrual, 'p0') - revenueOf(cashWithout, 'p0')).toBeGreaterThanOrEqual(0);
    expect(revenueOf(cash, 'p1') - revenueOf(cashWithout, 'p1')).toBe(60000);
    expect(revenueOf(cash, 'p0')).toBe(revenueOf(cashWithout, 'p0'));

    async function makeServiceWithoutInvoice() {
      const index = LEGS.findIndex((leg) => leg.referenceId === 6001);
      const removed = LEGS.splice(index, 2);
      try {
        return await service.sheet({ ...range, basis: 'cash' } as any);
      } finally {
        LEGS.splice(index, 0, ...removed);
      }
    }
  });

  it('FT-013: платёж 05.01.2026 с начислением 2025-12 — в прибыли декабря, по деньгам — в январе', async () => {
    const range = { fromDate: '2025-12-01', toDate: '2026-01-31', dateGroup: 'month' };
    const accrual = (await service.sheet({ ...range, basis: 'accrual' } as any)).data;
    const cash = (await service.sheet({ ...range, basis: 'cash' } as any)).data;
    const admin = (data: any, key: string) =>
      data.periods.find((p: any) => p.key === key).column.amounts.administrative;

    // В декабре 2025 других операций нет — только эта аренда.
    expect(admin(accrual, 'p0')).toBe(5000);
    expect(admin(cash, 'p0')).toBe(0);
    expect(admin(cash, 'p1') - admin(accrual, 'p1')).toBeGreaterThanOrEqual(0);
  });

  it('FT-012: выключенные «Сделки» убирают выручку счетов в обоих методах; всё включено — как было', async () => {
    const range = { fromDate: '2026-02-01', toDate: '2026-03-31', dateGroup: 'total' };
    const noDeals = makeService({ deals: false });
    const allOn = makeService({ operations: true, deals: true, credits: true, fixed_assets: true });

    for (const basis of ['accrual', 'cash']) {
      const base = (await service.sheet({ ...range, basis } as any)).data.total.amounts.revenue;
      const on = (await allOn.sheet({ ...range, basis } as any)).data.total.amounts.revenue;
      const off = (await noDeals.sheet({ ...range, basis } as any)).data.total.amounts.revenue;

      expect(on).toBe(base);
      expect(base - off).toBe(60000);
    }
  });

  it('критерий 3: колонка без выручки — рентабельности «н/о» (пусто), не 0 % и не 100 %', async () => {
    const { data } = await service.sheet({ fromDate: '2027-01-01', toDate: '2027-01-31' } as any);
    const table = new ManagerialPnlTable(data, i18n);
    const margins = table.tableData().filter((row) => row.id.endsWith('_margin'));

    expect(margins).toHaveLength(5);
    margins.forEach((row) => expect(row.cells[1].value).toBe(''));
  });

  it('по направлениям: направления яруса вместе с «без» дают сумму яруса', async () => {
    const { data } = await service.sheet({ ...YEAR, dateGroup: 'total', group: 'directions' } as any);
    const revenue = data.total.rows.find((r) => r.id === 'revenue')!;
    const sum = revenue.children.reduce((s, c) => s + (c.amount ?? 0), 0);

    expect(revenue.children.map((c) => c.name)).toEqual(['Кофейня', 'Без направления']);
    expect(Math.abs(sum - (revenue.amount ?? 0))).toBeLessThan(0.01);
  });
});
