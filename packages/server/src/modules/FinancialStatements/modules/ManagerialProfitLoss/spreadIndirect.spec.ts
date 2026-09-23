// © 2026 Bigfin
import { buildManagerialPnlColumn } from './buildManagerialPnlReport';
import { spreadIndirectCosts } from './spreadIndirect';

/** Распределение косвенных расходов по направлениям (FT-011 ТЗ-3). */
const ARTICLES = [
  { id: 1, name: 'Продажи', kind: 'income', parentId: null, plType: 'revenue' },
  { id: 2, name: 'Материалы', kind: 'expense', parentId: null, plType: 'direct_production' },
  { id: 3, name: 'Аренда офиса', kind: 'expense', parentId: null, plType: 'administrative' },
  { id: 4, name: 'Зарплата', kind: 'expense', parentId: null, plType: 'direct_production' },
];
const NAMES: Record<number, string> = { 10: 'OZON', 11: 'Wildberries', 12: 'Розница' };
const e = (articleId: number, amount: number, projectId: number | null) => ({
  articleId,
  accountId: 900 + articleId,
  projectId,
  amount,
});

const ENTRIES = [
  e(1, 600, 10),
  e(1, 300, 11),
  e(1, 100, 12),
  e(2, 100, 10),
  e(4, 60, 11),
  // Аренда без направления — косвенный расход.
  e(3, 300, null),
  // Материалы без направления — прямой расход, НЕ распределяется.
  e(2, 50, null),
];

const context = (group: any = 'directions') => ({
  articles: ARTICLES,
  group,
  projectName: (id: number) => NAMES[id],
  accountName: () => undefined,
});

const spread = (base: any) =>
  spreadIndirectCosts({
    entriesByPeriod: [ENTRIES],
    articles: ARTICLES,
    base,
    projectName: (id) => NAMES[id],
    payrollArticleId: 4,
  });

describe('распределение косвенных по направлениям', () => {
  it('критерий 1: по выручке — деньги не создаются и не исчезают, ВП1 и ЧП те же', () => {
    const before = buildManagerialPnlColumn(ENTRIES, context());
    const after = buildManagerialPnlColumn(spread('revenue').entriesByPeriod[0], context());

    expect(after.tiers).toEqual(before.tiers);
    const admin = after.rows.find((r) => r.id === 'administrative')!;
    expect(admin.children.map((c) => [c.name, c.amount])).toEqual([
      ['OZON', 180],
      ['Wildberries', 90],
      ['Розница', 30],
      // Всё распределено — «Без направления» осталась, но пустая.
      ['Без направления', 0],
    ]);
  });

  it('выручка и прямые производственные не распределяются никогда', () => {
    const entries = spread('equal').entriesByPeriod[0];
    expect(entries.filter((x) => x.articleId === 2 && x.projectId === null)).toHaveLength(1);
    expect(entries.filter((x) => x.articleId === 1 && x.projectId === null)).toHaveLength(0);
  });

  it('критерий 3: поровну — по сотне каждому', () => {
    const shares = spread('equal')
      .entriesByPeriod[0].filter((x) => x.articleId === 3)
      .map((x) => [x.projectId, x.amount]);
    expect(shares).toEqual([
      [12, 100],
      [10, 100],
      [11, 100],
    ]);
  });

  it('по ФОТ — всё тому, у кого зарплата (статья зарплаты из настроек)', () => {
    const shares = spread('production_payroll')
      .entriesByPeriod[0].filter((x) => x.articleId === 3)
      .map((x) => [x.projectId, x.amount]);
    expect(shares).toEqual([[11, 300]]);
  });

  it('база нулевая — аренда остаётся без направления, и это посчитано', () => {
    const result = spreadIndirectCosts({
      entriesByPeriod: [ENTRIES],
      articles: ARTICLES,
      base: 'production_payroll',
      projectName: (id) => NAMES[id],
      payrollArticleId: null,
    });
    expect(result.zeroBasePeriods).toBe(1);
    expect(result.entriesByPeriod[0]).toEqual(ENTRIES);
  });
});
