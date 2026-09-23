// © 2026 Bigfin
import { buildManagerialPnlColumn } from './buildManagerialPnlReport';
import { PnlEntry } from './ManagerialPnlSource.service';

/**
 * Строки управленческого ОПиУ (FT-010 ТЗ-3): ярус статьи, наследование,
 * «Не отнесено к ярусу», раскрытие до направлений.
 */
const ARTICLES = [
  { id: 1, name: 'Выручка', kind: 'income', parentId: null, plType: 'revenue' },
  { id: 2, name: 'Расходы', kind: 'expense', parentId: null, plType: 'administrative' },
  // Наследует ярус родителя.
  { id: 3, name: 'Аренда офиса', kind: 'expense', parentId: 2, plType: null },
  // Свой ярус — уходит из «Административных» в «Прямые переменные».
  { id: 4, name: 'Эквайринг', kind: 'expense', parentId: 2, plType: 'direct_variable' },
  // Без яруса вовсе.
  { id: 5, name: 'Прочее', kind: 'expense', parentId: null, plType: null },
  // Явно исключена из ОПиУ.
  { id: 6, name: 'Займы', kind: 'expense', parentId: null, plType: 'excluded' },
];

const entry = (
  articleId: number | null,
  amount: number,
  projectId: number | null = null,
  accountId = 900,
): PnlEntry => ({ articleId, accountId, projectId, amount });

const context = (group: any = 'articles') => ({
  articles: ARTICLES,
  group,
  projectName: (id: number) => ({ 10: 'Кофейня' } as any)[id],
  accountName: (id: number) => ({ 901: 'Прочие доходы (без статьи)' } as any)[id],
});

const find = (rows: any[], id: string): any => {
  for (const row of rows) {
    if (row.id === id) return row;
    const inner = find(row.children, id);
    if (inner) return inner;
  }
  return undefined;
};

describe('строки управленческого ОПиУ', () => {
  const column = buildManagerialPnlColumn(
    [
      entry(1, 1000),
      entry(2, 50),
      entry(3, 100),
      entry(4, 30),
      entry(5, 20),
      entry(6, 999),
      entry(null, 70, null, 901),
    ],
    context(),
  );

  it('подстатья с наследованным ярусом стоит под родителем, со своим — в своём ярусе', () => {
    const admin = find(column.rows, 'administrative');
    expect(admin.amount).toBe(150);
    expect(admin.children.map((c: any) => c.id)).toEqual(['article-2']);
    expect(admin.children[0].children.map((c: any) => c.id)).toEqual(['article-3']);
    // Родитель показывает себя и детей СВОЕГО яруса: 50 + 100.
    expect(admin.children[0].amount).toBe(150);

    expect(find(column.rows, 'direct_variable').amount).toBe(30);
    expect(find(column.rows, 'direct_variable').children[0].id).toBe('article-4');
  });

  it('лестница: МД, ВП и чистая прибыль по формулам', () => {
    expect(find(column.rows, 'md').amount).toBe(970);
    expect(find(column.rows, 'md_margin').amount).toBe(97);
    expect(find(column.rows, 'np').amount).toBe(820);
  });

  it('«Не отнесено к ярусу»: статья без яруса и счёт без статьи, со знаком', () => {
    const unassigned = find(column.rows, 'unassigned');

    expect(unassigned.children.map((c: any) => c.id)).toEqual(['article-5', 'account-901']);
    expect(find(column.rows, 'article-5').amount).toBe(-20);
    expect(find(column.rows, 'account-901').amount).toBe(70);
    expect(unassigned.amount).toBe(50);
    // В чистую прибыль не входит: лестница показывает только размеченное.
    expect(column.tiers.np).toBe(820);
  });

  it('исключённая статья не попадает никуда', () => {
    expect(find(column.rows, 'article-6')).toBeUndefined();
  });

  it('по направлениям: ярус раскрывается до направлений, «без» последним', () => {
    const byDirections = buildManagerialPnlColumn(
      [entry(1, 600, 10), entry(1, 400, null)],
      context('directions'),
    );
    const revenue = find(byDirections.rows, 'revenue');

    expect(revenue.children.map((c: any) => [c.id, c.name, c.amount])).toEqual([
      ['revenue-direction-10', 'Кофейня', 600],
      ['revenue-direction-none', 'Без направления', 400],
    ]);
  });

  it('направления и статьи: статья под направлением со своим ключом', () => {
    const both = buildManagerialPnlColumn(
      [entry(1, 600, 10), entry(3, 40, 10)],
      context('directions_articles'),
    );

    expect(find(both.rows, 'revenue-direction-10').children[0].id).toBe('direction-10-article-1');
    expect(find(both.rows, 'direction-10-article-3').amount).toBe(40);
  });
});
