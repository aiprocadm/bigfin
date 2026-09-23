// © 2026 Bigfin
import { HttpStatus } from '@nestjs/common';

import { ServiceError } from '@/modules/Items/ServiceError';
import { legDate } from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { CashFlowArticlesTable } from './CashFlowArticlesTable';
import { LEGS, makeService } from './cashFlowArticlesFixture';
import { PERIOD_TOO_WIDE_FOR_GRANULARITY } from './periodizeRows';

/**
 * «Деньги по статьям» матрицей «статьи × периоды» (FT-001 ТЗ-3) — служба
 * целиком: настоящая кассовая свёртка, настоящая сцепка остатков, база —
 * в памяти.
 *
 * Фикстура — 5 000 случайных операций (критерий приёмки 2) плюс операции до
 * начала отчёта, чтобы остаток на начало не был нулём: нулевой остаток на
 * начало прячет ошибку «забыли прибавить начало».
 */

const RANGE = { fromDate: '2021-01-01', toDate: '2022-05-31' };
const i18n = { t: (key: string) => key } as any;

/** Таблица → «ключ строки → ячейки по ключу колонки». */
function cellsByRow(data: any, showTotalColumn = true) {
  const table = new CashFlowArticlesTable(data, i18n, {
    showTotalColumn,
    showEmpty: true,
    showTransfers: true,
  });
  const columns = table.tableColumns();
  const result = new Map<string, Record<string, number>>();

  const walk = (rows: any[]) =>
    rows.forEach((row) => {
      const cells: Record<string, number> = {};
      row.cells.slice(1).forEach((cell: any) => {
        cells[cell.key] = Number(cell.value);
      });
      result.set(row.id, cells);
      walk(row.children ?? []);
    });
  walk(table.tableData());

  return { columns, rows: result };
}

describe('«Деньги по статьям» по периодам: служба целиком', () => {
  const service = makeService();

  it('критерий 1: 17 месяцев — 17 колонок периодов и колонка «Итого»', async () => {
    const { data } = await service.sheet({ ...RANGE, dateGroup: 'month' });
    const { columns } = cellsByRow(data);

    expect(data.periods).toHaveLength(17);
    expect(columns.map((c) => c.key)).toEqual([
      'name',
      ...Array.from({ length: 17 }, (_, i) => `p${i}`),
      'total',
    ]);
    // Порядок ячеек = порядок колонок: по нему идёт выгрузка в Excel.
    columns.forEach((column, index) => expect(column.cellIndex).toBe(index));
  });

  it('масштаб по умолчанию — месяцы', async () => {
    const { data } = await service.sheet({ ...RANGE });

    expect(data.dateGroup).toBe('month');
    expect(data.periods).toHaveLength(17);
  });

  it('критерий 2: конец каждой колонки = начало следующей', async () => {
    const { data } = await service.sheet({ ...RANGE, dateGroup: 'month' });

    expect(data.isChained).toBe(true);
    data.periods.slice(1).forEach((period, index) => {
      expect(period.report.openingBalance).toBe(
        data.periods[index].report.closingBalance,
      );
    });
    data.periods.forEach((period) => {
      expect(period.report.isBalanced).toBe(true);
    });
  });

  it('конец цепочки сходится с остатком из базы, посчитанным отдельно', async () => {
    const { data } = await service.sheet({ ...RANGE, dateGroup: 'week' });
    const through = LEGS.filter(
      (leg) =>
        [100, 101].includes(leg.accountId) && legDate(leg)! <= RANGE.toDate,
    ).reduce((sum, leg) => sum + leg.debit - leg.credit, 0);

    expect(data.isBalanced).toBe(true);
    expect(data.closingBalance).toBeCloseTo(through, 2);
    // Остаток на начало не ноль — иначе тест не отличил бы «забыли начало».
    expect(Math.abs(data.openingBalance)).toBeGreaterThan(1000);
  });

  it('конец − начало = сумма чистого потока по всем колонкам', async () => {
    const { data } = await service.sheet({ ...RANGE, dateGroup: 'month' });
    const net = data.periods.reduce((sum, p) => sum + p.report.netCashFlow, 0);

    expect(data.closingBalance - data.openingBalance).toBeCloseTo(net, 2);
  });

  it('критерий 3: «Итого» каждой строки потока = сумма колонок (±0,001 ₽)', async () => {
    const { data } = await service.sheet({ ...RANGE, dateGroup: 'month' });
    const { rows } = cellsByRow(data);

    rows.forEach((cells, rowId) => {
      if (rowId === 'opening' || rowId === 'closing') return;
      const sum = data.periods.reduce((total, p) => total + cells[p.key], 0);
      expect(Math.abs(cells.total - sum)).toBeLessThan(0.001);
    });
    // Остатки в «Итого» — начало первой и конец последней колонки.
    expect(rows.get('opening')!.total).toBe(rows.get('opening')!.p0);
    expect(rows.get('closing')!.total).toBe(rows.get('closing')!.p16);
  });

  it('критерий 4: переход на кварталы не меняет «Итого» ни в одной строке', async () => {
    const monthly = cellsByRow((await service.sheet({ ...RANGE, dateGroup: 'month' })).data);
    const quarterly = cellsByRow((await service.sheet({ ...RANGE, dateGroup: 'quarter' })).data);

    expect([...quarterly.rows.keys()].sort()).toEqual([...monthly.rows.keys()].sort());
    monthly.rows.forEach((cells, rowId) => {
      expect(quarterly.rows.get(rowId)!.total).toBe(cells.total);
    });
  });

  it('и дни, и недели, и год дают то же «Итого», что месяцы (отрезок с обрезанными краями)', async () => {
    // Границы посреди месяца и недели: края колонок обрезаются, и именно
    // здесь «Итого» разошлось бы, если бы край захватил лишние дни.
    const range = { fromDate: '2021-03-10', toDate: '2022-02-20' };
    const monthly = cellsByRow((await service.sheet({ ...range, dateGroup: 'month' })).data);

    for (const dateGroup of ['day', 'week', 'year'] as const) {
      const other = cellsByRow((await service.sheet({ ...range, dateGroup })).data);
      monthly.rows.forEach((cells, rowId) => {
        expect(other.rows.get(rowId)!.total).toBe(cells.total);
      });
    }
  });

  it('месяц без операций остаётся колонкой: потоки ноль, остаток переносится', async () => {
    const { data } = await service.sheet({ ...RANGE, dateGroup: 'month' });
    const july = data.periods.find((p) => p.fromDate === '2021-07-01')!;

    expect(july.report.netCashFlow).toBe(0);
    expect(july.report.closingBalance).toBe(july.report.openingBalance);
    expect(july.report.openingBalance).not.toBe(0);
  });

  it('деньги мимо статей видны строкой «не разнесено», переводы — отдельным блоком', async () => {
    const { data } = await service.sheet({ ...RANGE, dateGroup: 'quarter' });
    const { rows } = cellsByRow(data);

    expect(rows.get('unclassified')!.total).toBeLessThan(0);
    expect(rows.get('transfers')!.total).toBe(0);
    expect(rows.get('transfers-in')!.total).toBeGreaterThan(0);
  });

  it('«Итого» можно выключить', async () => {
    const { data } = await service.sheet({ ...RANGE, dateGroup: 'quarter' });
    const { columns } = cellsByRow(data, false);

    expect(columns.map((c) => c.key)).not.toContain('total');
  });

  it('по дням больше 400 дней — 400 и понятный код', async () => {
    let error: any;
    try {
      await service.sheet({
        fromDate: '2021-01-01',
        toDate: '2022-12-31',
        dateGroup: 'day',
      });
    } catch (thrown) {
      error = thrown;
    }

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.errorType).toBe(PERIOD_TOO_WIDE_FOR_GRANULARITY);
    expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(error.message).toContain('крупный масштаб');
  });
});
