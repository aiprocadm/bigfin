// © 2026 Bigfin
import { buildManagerialPnlColumn } from './buildManagerialPnlReport';
import { expandPayrollByEmployees } from './payrollByEmployees';

/**
 * «ФОТ по сотрудникам» (FT-014 ТЗ-3): раскрытие не меняет ни одной суммы
 * отчёта, а сумма раскрытия равна строке зарплаты.
 */
describe('ФОТ по сотрудникам', () => {
  const articles = [
    { id: 1, name: 'Выручка', kind: 'income', plType: 'revenue', parentId: null },
    { id: 5, name: 'Зарплата', kind: 'expense', plType: 'administrative', parentId: null },
    { id: 6, name: 'Без яруса', kind: 'expense', plType: null, parentId: null },
  ];
  const context = {
    articles,
    group: 'articles' as const,
    projectName: () => undefined,
    accountName: () => undefined,
  };
  const entry = (articleId: number, amount: number) =>
    ({ articleId, amount, projectId: null, accountId: 1, date: '2026-01-10' }) as any;
  const roster = [
    { employeeId: 10, name: 'Иванов' },
    { employeeId: 11, name: 'Петров' },
  ];

  const find = (rows: any[], id: string): any => {
    for (const row of rows) {
      if (row.id === id) return row;
      const inner = find(row.children, id);
      if (inner) return inner;
    }
    return undefined;
  };

  it('сотрудники плюс остаток равны строке зарплаты, ярусы не меняются', () => {
    const column = buildManagerialPnlColumn([entry(1, 500_000), entry(5, 150_000)], context);
    const { column: expanded, found } = expandPayrollByEmployees(
      column,
      5,
      [
        { employeeId: 10, name: 'Иванов', amount: 80_000 },
        { employeeId: 11, name: 'Петров', amount: 60_000 },
      ],
      roster,
    );

    expect(found).toBe(true);
    const salary = find(expanded.rows, 'article-5');
    expect(salary.amount).toBe(150_000);
    expect(salary.children.map((c: any) => [c.id, c.amount])).toEqual([
      ['article-5-employee-10', 80_000],
      ['article-5-employee-11', 60_000],
      ['article-5-employee-other', 10_000],
    ]);
    const sum = salary.children.reduce((s: number, c: any) => s + c.amount, 0);
    expect(sum).toBe(salary.amount);
    expect(expanded.tiers).toEqual(column.tiers);
  });

  it('расчёт есть, а оплаты по статье нет — остаток отрицательный и виден', () => {
    const column = buildManagerialPnlColumn([entry(1, 100)], context);
    const { column: expanded } = expandPayrollByEmployees(
      column,
      5,
      [{ employeeId: 10, name: 'Иванов', amount: 80_000 }],
      roster,
    );
    const salary = find(expanded.rows, 'article-5');
    expect(salary.amount).toBe(0);
    expect(find(expanded.rows, 'article-5-employee-other').amount).toBe(-80_000);
  });

  it('сотрудник без выплаты в колонке — ноль, строки одинаковы во всех колонках', () => {
    const column = buildManagerialPnlColumn([entry(5, 30_000)], context);
    const { column: expanded } = expandPayrollByEmployees(
      column,
      5,
      [{ employeeId: 11, name: 'Петров', amount: 30_000 }],
      roster,
    );
    expect(find(expanded.rows, 'article-5-employee-10').amount).toBe(0);
    expect(find(expanded.rows, 'article-5-employee-other').amount).toBe(0);
  });

  it('статья зарплаты без яруса — не раскрывается', () => {
    const column = buildManagerialPnlColumn([entry(6, 30_000)], context);
    const { column: expanded, found } = expandPayrollByEmployees(column, 6, [], roster);
    expect(found).toBe(false);
    expect(find(expanded.rows, 'article-6').children).toEqual([]);
  });
});
