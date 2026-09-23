// © 2026 Bigfin
import { buildReportPeriods } from '../CashFlowArticles/periodizeRows';
import { buildManagerialPnlColumn } from './buildManagerialPnlReport';
import { ManagerialPnlTable } from './ManagerialPnlTable';

/**
 * «Золотой» ответ управленческого ОПиУ (FT-010 ТЗ-3): каждая ячейка
 * посчитана руками. Свойства ловят нарушение формул, золотой ответ — «всё
 * сошлось, а число не то».
 *
 * Январь: выручка 100 000, эквайринг 2 000, материалы 30 000, цех 8 000,
 *   офис 10 000, реклама 5 000, проценты банка 1 000, налог 9 000,
 *   дивиденды 20 000.
 * Февраль: выручка 0, офис 10 000 (месяц без продаж).
 */
const ARTICLES = [
  { id: 1, name: 'Продажи', kind: 'income', parentId: null, plType: 'revenue' },
  { id: 2, name: 'Эквайринг', kind: 'expense', parentId: null, plType: 'direct_variable' },
  { id: 3, name: 'Материалы', kind: 'expense', parentId: null, plType: 'direct_production' },
  { id: 4, name: 'Цех', kind: 'expense', parentId: null, plType: 'overhead_production' },
  { id: 5, name: 'Офис', kind: 'expense', parentId: null, plType: 'administrative' },
  { id: 6, name: 'Реклама', kind: 'expense', parentId: null, plType: 'commercial' },
  { id: 7, name: 'Проценты банка', kind: 'income', parentId: null, plType: 'other_income_below_ebitda' },
  { id: 8, name: 'Налог', kind: 'expense', parentId: null, plType: 'below_ebitda' },
  { id: 9, name: 'Дивиденды', kind: 'expense', parentId: null, plType: 'below_net_profit' },
];

const e = (articleId: number, amount: number) => ({
  articleId,
  accountId: 100 + articleId,
  projectId: null,
  amount,
});

const JAN = [e(1, 100000), e(2, 2000), e(3, 30000), e(4, 8000), e(5, 10000), e(6, 5000), e(7, 1000), e(8, 9000), e(9, 20000)];
const FEB = [e(5, 10000)];

const context = {
  articles: ARTICLES,
  group: 'articles' as const,
  projectName: () => undefined,
  accountName: () => undefined,
};

const periods = buildReportPeriods('2026-01-01', '2026-02-28', 'month');
const data = {
  group: 'articles' as const,
  basis: 'accrual' as const,
  dateGroup: 'month',
  periods: [
    { ...periods[0], column: buildManagerialPnlColumn(JAN, context) },
    { ...periods[1], column: buildManagerialPnlColumn(FEB, context) },
  ],
  total: buildManagerialPnlColumn([...JAN, ...FEB], context),
};

describe('золотой ответ управленческого ОПиУ', () => {
  it('каждая ячейка — как посчитано руками', () => {
    const table = new ManagerialPnlTable(data, { t: (key: string) => key } as any);
    const rows = table
      .tableData()
      .map((row) => [row.id, ...row.cells.slice(1).map((cell) => cell.value)]);

    expect(rows).toEqual([
      // id                              январь     февраль   итого
      ['revenue',                        '100000',  '0',      '100000'],
      ['direct_variable',                '2000',    '0',      '2000'],
      ['md',                             '98000',   '0',      '98000'],
      // Февраль без выручки: рентабельность не определена — пусто, не «0 %».
      ['md_margin',                      '98',      '',       '98'],
      ['direct_production',              '30000',   '0',      '30000'],
      ['gp1',                            '68000',   '0',      '68000'],
      ['gp1_margin',                     '68',      '',       '68'],
      ['overhead_production',            '8000',    '0',      '8000'],
      ['gp2',                            '60000',   '0',      '60000'],
      ['gp2_margin',                     '60',      '',       '60'],
      ['administrative',                 '10000',   '10000',  '20000'],
      ['commercial',                     '5000',    '0',      '5000'],
      ['op',                             '45000',   '-10000', '35000'],
      ['op_margin',                      '45',      '',       '35'],
      ['other_income_below_ebitda',      '1000',    '0',      '1000'],
      ['below_ebitda',                   '9000',    '0',      '9000'],
      // Дивиденды ниже ЧП и на неё не влияют.
      ['np',                             '37000',   '-10000', '27000'],
      ['np_margin',                      '37',      '',       '27'],
      ['below_net_profit',               '20000',   '0',      '20000'],
    ]);
  });

  it('статьи раскрывают свои ярусы', () => {
    const table = new ManagerialPnlTable(data, { t: (key: string) => key } as any);
    const admin = table.tableData().find((row) => row.id === 'administrative')!;

    expect(admin.children.map((child) => [child.id, child.cells[0].value])).toEqual([
      ['article-5', 'Офис'],
    ]);
  });
});
