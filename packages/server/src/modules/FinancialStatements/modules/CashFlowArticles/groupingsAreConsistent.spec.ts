// © 2026 Bigfin
import { CashFlowArticlesTable } from './CashFlowArticlesTable';
import { makeService } from './cashFlowArticlesFixture';
import { CASHFLOW_GROUPINGS, CashFlowGrouping } from './groupings/cashGroupNodes';

/**
 * Шесть группировок отчёта «Деньги» согласованы между собой (FT-002 ТЗ-3).
 *
 * Критерий приёмки 1: переключение группировки меняет ТОЛЬКО строки —
 * «Чистый денежный поток» и «Денег на конец» одинаковы во всех шести
 * режимах. Критерий 2: направления вместе с «Без направления» дают итог.
 *
 * Фикстура — те же 5 000 операций, что у проверок матрицы, с контрагентами
 * и направлениями на ногах «не деньги».
 */
const RANGE = { fromDate: '2021-01-01', toDate: '2022-05-31' };
const i18n = { t: (key: string) => key } as any;
const service = makeService();

async function sheet(group: CashFlowGrouping, dateGroup: any = 'quarter') {
  return (await service.sheet({ ...RANGE, dateGroup, group })).data;
}

/** Таблица → строки по ключу, ячейки по ключу колонки. */
function tableOf(data: any, options: any = {}) {
  const table = new CashFlowArticlesTable(data, i18n, options);
  const rows = new Map<string, any>();
  const walk = (list: any[], depth: number) =>
    list.forEach((row) => {
      const cells: Record<string, number> = {};
      row.cells.slice(1).forEach((cell: any) => (cells[cell.key] = Number(cell.value)));
      rows.set(row.id, { ...row, depth, name: row.cells[0].value, values: cells });
      walk(row.children ?? [], depth + 1);
    });
  walk(table.tableData(), 0);
  return { rows, columns: table.tableColumns() };
}

/** Поступления минус выплаты по верхним группам — плюс «не разнесено». */
function explained(data: any, columnKey: string) {
  const { rows } = tableOf(data, { showEmpty: true });
  let total = 0;
  rows.forEach((row) => {
    const type = row.rowTypes[0];
    const nestedInGroup = [...rows.values()].some(
      (parent) =>
        ['INFLOW', 'OUTFLOW'].includes(parent.rowTypes[0]) &&
        (parent.children ?? []).some((child: any) => child.id === row.id),
    );
    if (nestedInGroup) return;
    if (type === 'INFLOW') total += row.values[columnKey];
    if (type === 'OUTFLOW') total -= row.values[columnKey];
  });
  return total + (rows.get('unclassified')?.values[columnKey] ?? 0);
}

describe('шесть группировок отчёта «Деньги» согласованы', () => {
  it('критерий 1: чистый поток и остаток на конец одинаковы во всех шести', async () => {
    const base = await sheet('articles');

    for (const group of CASHFLOW_GROUPINGS) {
      const data = await sheet(group);

      expect(data.group).toBe(group);
      expect(data.isBalanced).toBe(true);
      data.periods.forEach((period: any, index: number) => {
        expect(period.report.netCashFlow).toBe(base.periods[index].report.netCashFlow);
        expect(period.report.closingBalance).toBe(base.periods[index].report.closingBalance);
      });
      expect(data.closingBalance).toBe(base.closingBalance);
    }
  });

  it('в каждой колонке строки + «не разнесено» = чистый поток, в любой группировке', async () => {
    for (const group of CASHFLOW_GROUPINGS) {
      const data = await sheet(group);

      [...data.periods.map((p: any) => p.key), 'total'].forEach((key) => {
        const net =
          key === 'total'
            ? data.netCashFlow
            : data.periods.find((p: any) => p.key === key).report.netCashFlow;
        expect(Math.abs(explained(data, key) - net)).toBeLessThan(0.01);
      });
    }
  });

  it('критерий 2: направления вместе с «Без направления» дают итог группы', async () => {
    const { rows } = tableOf(await sheet('directions'), { showEmpty: true });

    for (const group of ['inflow', 'outflow']) {
      const parent = rows.get(group);
      const children = parent.children.map((child: any) => rows.get(child.id));
      const sum = children.reduce((s: number, c: any) => s + c.values.total, 0);

      expect(Math.abs(sum - parent.values.total)).toBeLessThan(0.01);
      expect(children.map((c: any) => c.id)).toContain(`${group}-direction-none`);
    }
  });

  it('контрагенты подписаны именами, «Без контрагента» стоит последней', async () => {
    const { rows } = tableOf(await sheet('contacts'));
    const inflow = rows.get('inflow').children.map((c: any) => rows.get(c.id));

    expect(inflow.map((c: any) => c.name)).toEqual(
      expect.arrayContaining(['ООО «Ромашка»', 'ИП Иванов']),
    );
    expect(inflow[inflow.length - 1].id).toBe('inflow-contact-none');
  });

  it('по контрагентам и по счетам «не разнесено» нет: объяснены все деньги', async () => {
    // Статьи не знают счёт 700 — он «не разнесён». Контрагент и денежный
    // счёт есть у каждой ноги, поэтому эти вкладки объясняют всё.
    expect(tableOf(await sheet('articles')).rows.has('unclassified')).toBe(true);
    expect(tableOf(await sheet('contacts')).rows.has('unclassified')).toBe(false);
    expect(tableOf(await sheet('accounts')).rows.has('unclassified')).toBe(false);
  });

  it('по счетам: строки — денежные счета по именам', async () => {
    const { rows } = tableOf(await sheet('accounts'));

    expect(rows.get('inflow-account-100').name).toBe('Расчётный счёт');
  });

  it('направления и статьи: внутри направления — те же статьи, «не разнесено» как у статей', async () => {
    const byArticles = await sheet('articles');
    const data = await sheet('directions_articles');
    const { rows } = tableOf(data);

    expect(rows.get('direction-10').rowTypes[0]).toBe('DIRECTION');
    expect(rows.get('direction-10-inflow').rowTypes[0]).toBe('INFLOW');
    expect(rows.has('direction-none')).toBe(true);
    expect(data.unclassified).toBe(byArticles.unclassified);

    // Сумма статьи по всем направлениям = статья на вкладке «по статьям».
    const rent = [...rows.values()]
      .filter((row) => /^direction-(\d+|none)-article-3$/.test(row.id))
      .reduce((sum, row) => sum + row.values.total, 0);
    const rentAll = tableOf(byArticles).rows.get('article-3').values.total;
    expect(Math.abs(rent - rentAll)).toBeLessThan(0.01);
  });

  it('«Итого» не зависит от масштаба и в группировке по контрагентам', async () => {
    const monthly = tableOf(await sheet('contacts', 'month'), { showEmpty: true }).rows;
    const quarterly = tableOf(await sheet('contacts', 'quarter'), { showEmpty: true }).rows;

    monthly.forEach((row, id) => {
      expect(Math.abs(quarterly.get(id).values.total - row.values.total)).toBeLessThan(0.01);
    });
  });
});
