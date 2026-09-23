// © 2026 Bigfin
import {
  hasTotalColumn,
  managerialReportColumns,
} from '../../common/ManagerialReportColumns';
import { buildCashFlowArticlesMatrix } from './cashFlowArticlesMatrix';
import { CashFlowArticlesTable } from './CashFlowArticlesTable';
import { buildReportPeriods } from './periodizeRows';

/**
 * «Золотой» ответ матрицы «Деньги по статьям» (FT-001 ТЗ-3).
 *
 * Маленький пример, где КАЖДАЯ ячейка посчитана руками и записана здесь.
 * Проверки-свойства ловят нарушение равенств, но не ловят «всё сошлось, а
 * число не то»; золотой ответ ловит именно это.
 *
 * Январь: выручка 100 000, аренда 30 000, мимо статей −500; перевод 7 000.
 * Февраль: выручка 50 000, аренда 30 000.
 * Март (с 1 по 15 — отчёт обрезан): аренда 30 000.
 * Начало: 10 000.
 */
const ARTICLES = [
  { id: 1, name: 'Выручка', kind: 'income', parentId: null, cashflowSection: 'operating' },
  { id: 2, name: 'Расходы', kind: 'expense', parentId: null, cashflowSection: 'operating' },
  { id: 3, name: 'Аренда', kind: 'expense', parentId: 2, cashflowSection: 'operating' },
];

const PERIODS = buildReportPeriods('2026-01-01', '2026-03-15', 'month');

// Суммы уже свёрнуты в предков, как их отдаёт кассовая свёртка.
const INPUT = [
  { amounts: [{ id: 1, amount: 100000 }, { id: 2, amount: 30000 }, { id: 3, amount: 30000 }], net: 69500, transfers: { incoming: 7000, outgoing: 7000 } },
  { amounts: [{ id: 1, amount: 50000 }, { id: 2, amount: 30000 }, { id: 3, amount: 30000 }], net: 20000, transfers: { incoming: 0, outgoing: 0 } },
  { amounts: [{ id: 2, amount: 30000 }, { id: 3, amount: 30000 }], net: -30000, transfers: { incoming: 0, outgoing: 0 } },
];

function matrix() {
  let opening = 10000;
  return buildCashFlowArticlesMatrix({
    articles: ARTICLES,
    dateGroup: 'month',
    periods: PERIODS.map((period, index) => {
      const periodOpening = opening;
      opening += INPUT[index].net;
      return {
        ...period,
        amounts: INPUT[index].amounts,
        openingBalance: periodOpening,
        closingBalance: opening,
        transfers: INPUT[index].transfers,
      };
    }),
  });
}

function table(showTotalColumn = true) {
  const built = matrix();
  const t = new CashFlowArticlesTable(
    { ...built.total, dateGroup: built.dateGroup, periods: built.periods, isChained: built.isChained },
    { t: (key: string) => key } as any,
    showTotalColumn,
  );
  const flat: Array<[string, string, ...number[]]> = [];
  const walk = (rows: any[]) =>
    rows.forEach((row) => {
      flat.push([row.id, row.cells[0].value, ...row.cells.slice(1).map((c: any) => Number(c.value))]);
      walk(row.children ?? []);
    });
  walk(t.tableData());
  return { columns: t.tableColumns(), rows: flat };
}

describe('золотой ответ матрицы «Деньги по статьям»', () => {
  it('колонки: статья, январь, февраль, обрезанный март, итого', () => {
    expect(table().columns.map((c) => [c.key, c.label, c.cellIndex])).toEqual([
      ['name', 'Статья', 0],
      ['p0', 'Январь 2026', 1],
      ['p1', 'Февраль 2026', 2],
      ['p2', '01.03–15.03.2026', 3],
      ['total', 'Итого', 4],
    ]);
  });

  it('каждая ячейка — как посчитано руками', () => {
    //                  id                     январь    февраль   март      итого
    expect(table().rows.map(([id, , ...cells]) => [id, ...cells])).toEqual([
      ['opening',             10000,    79500,    99500,    10000],
      ['section-operating',   70000,    20000,   -30000,    60000],
      ['inflow-operating',   100000,    50000,        0,   150000],
      ['article-1',          100000,    50000,        0,   150000],
      ['outflow-operating',   30000,    30000,    30000,    90000],
      ['article-2',           30000,    30000,    30000,    90000],
      ['article-3',           30000,    30000,    30000,    90000],
      ['section-investing',       0,        0,        0,        0],
      ['inflow-investing',        0,        0,        0,        0],
      ['outflow-investing',       0,        0,        0,        0],
      ['section-financing',       0,        0,        0,        0],
      ['inflow-financing',        0,        0,        0,        0],
      ['outflow-financing',       0,        0,        0,        0],
      // Мимо статей −500 только в январе; в «Итого» тоже −500.
      ['unclassified',         -500,        0,        0,     -500],
      ['net',                 69500,    20000,   -30000,    59500],
      ['closing',             79500,    99500,    69500,    69500],
      ['transfers',               0,        0,        0,        0],
      ['transfers-in',         7000,        0,        0,     7000],
      ['transfers-out',        7000,        0,        0,     7000],
    ]);
  });

  it('цепочка и равенства: сцеплено и сходится в каждой колонке', () => {
    const built = matrix();

    expect(built.isChained).toBe(true);
    expect(built.total.isBalanced).toBe(true);
    built.periods.forEach((p) => expect(p.report.isBalanced).toBe(true));
  });

  it('разорванную цепочку видно, а не прячем', () => {
    const built = buildCashFlowArticlesMatrix({
      articles: ARTICLES,
      dateGroup: 'month',
      periods: [
        { ...PERIODS[0], amounts: [], openingBalance: 0, closingBalance: 100, transfers: { incoming: 0, outgoing: 0 } },
        // Начало февраля не равно концу января.
        { ...PERIODS[1], amounts: [], openingBalance: 90, closingBalance: 90, transfers: { incoming: 0, outgoing: 0 } },
      ],
    });

    expect(built.isChained).toBe(false);
  });

  it('строка «не разнесено» прячется, только когда пусто во ВСЕХ колонках', () => {
    // Январь −500, февраль +500: в «Итого» ноль, но в месяцах деньги
    // мимо статей были — строка обязана остаться.
    const built = buildCashFlowArticlesMatrix({
      articles: ARTICLES,
      dateGroup: 'month',
      periods: [
        { ...PERIODS[0], amounts: [], openingBalance: 0, closingBalance: -500, transfers: { incoming: 0, outgoing: 0 } },
        { ...PERIODS[1], amounts: [], openingBalance: -500, closingBalance: 0, transfers: { incoming: 0, outgoing: 0 } },
      ],
    });
    const t = new CashFlowArticlesTable(
      { ...built.total, dateGroup: 'month', periods: built.periods, isChained: true },
      { t: (key: string) => key } as any,
    );

    expect(t.tableData().map((row) => row.id)).toContain('unclassified');
  });

  it('без «Итого» — только периоды', () => {
    expect(table(false).columns.map((c) => c.key)).toEqual(['name', 'p0', 'p1', 'p2']);
    expect(table(false).rows[0]).toEqual(['opening', 'Остаток на начало', 10000, 79500, 99500]);
  });
});

describe('колонки управленческой матрицы', () => {
  it('одна колонка-период — без «Итого»: она повторяла бы её же', () => {
    expect(hasTotalColumn(1, true)).toBe(false);
    expect(hasTotalColumn(2, undefined)).toBe(true);
    expect(hasTotalColumn(2, false)).toBe(false);
  });

  it('колонка периода несёт свои границы — экран подпишет её сам', () => {
    const [, first] = managerialReportColumns({
      nameLabel: 'Статья',
      totalLabel: 'Итого',
      periods: buildReportPeriods('2026-01-15', '2026-02-28', 'month'),
    });

    expect(first).toEqual({
      key: 'p0',
      label: '15.01–31.01.2026',
      cellIndex: 1,
      fromDate: '2026-01-15',
      toDate: '2026-01-31',
      isPartial: true,
    });
  });
});
