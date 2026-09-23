// © 2026 Bigfin
import { HttpStatus } from '@nestjs/common';

import { ServiceError } from '@/modules/Items/ServiceError';
import {
  ArticlesCashflowRollupService,
  legDate,
} from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { CashFlowArticlesService } from './CashFlowArticlesService';
import { CashFlowArticlesTable } from './CashFlowArticlesTable';
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

// Счета: 100 и 101 — денежные; 500 — расход «Аренда», 600 — доход
// «Выручка», 700 — расход, НЕ привязанный к статье (уходит в «не разнесено»).
const ACCOUNTS = [
  { id: 100, accountType: 'bank', accountNormal: 'debit' },
  { id: 101, accountType: 'cash', accountNormal: 'debit' },
  { id: 500, accountType: 'expense', accountNormal: 'debit' },
  { id: 600, accountType: 'income', accountNormal: 'credit' },
  { id: 700, accountType: 'expense', accountNormal: 'debit' },
];
const ARTICLES = [
  { id: 1, name: 'Расходы', kind: 'expense', parentId: null, sortOrder: 1 },
  { id: 3, name: 'Аренда', kind: 'expense', parentId: 1, sortOrder: 2 },
  { id: 2, name: 'Выручка', kind: 'income', parentId: null, sortOrder: 3 },
];
const MAP = [
  { accountId: 500, articleId: 3 },
  { accountId: 600, articleId: 2 },
];

/** Повторяемый «случайный» ряд: упавший тест должен падать так же завтра. */
function prng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function makeLegs(count: number) {
  const random = prng(20260923);
  const legs: any[] = [];
  const day0 = new Date('2020-10-01T00:00:00').getTime();
  const days = 640; // по конец мая 2022

  for (let id = 1; id <= count; id += 1) {
    const date = new Date(day0 + Math.floor(random() * days) * 86400000);
    // Июль 2021 оставляем пустым: месяц без операций, но с остатком.
    if (date.getFullYear() === 2021 && date.getMonth() === 6) continue;

    const amount = Math.round(random() * 100000_00) / 100;
    const kind = random();
    const base = { referenceType: 'CashflowTransaction', referenceId: id, date };

    if (kind < 0.4) {
      legs.push({ ...base, accountId: 100, debit: amount, credit: 0 });
      legs.push({ ...base, accountId: 600, debit: 0, credit: amount });
    } else if (kind < 0.75) {
      legs.push({ ...base, accountId: 500, debit: amount, credit: 0 });
      legs.push({ ...base, accountId: 100, debit: 0, credit: amount });
    } else if (kind < 0.85) {
      legs.push({ ...base, accountId: 700, debit: amount, credit: 0 });
      legs.push({ ...base, accountId: 100, debit: 0, credit: amount });
    } else {
      legs.push({
        ...base,
        accountId: 101,
        debit: amount,
        credit: 0,
        transactionType: 'TransferToAccount',
      });
      legs.push({
        ...base,
        accountId: 100,
        debit: 0,
        credit: amount,
        transactionType: 'TransferFromAccount',
      });
    }
  }
  return legs;
}

const LEGS = makeLegs(5000);

/** Мини-исполнитель запроса: понимает ровно те условия, что ставит служба. */
function runQuery(rows: any[], build: (qb: any) => void) {
  const filters: Array<(row: any) => boolean> = [];
  let aggregate = false;
  const qb: any = {
    sum: () => {
      aggregate = true;
      return qb;
    },
    whereIn: (column: string, values: any[]) => {
      filters.push((row) => values.includes(row[column]));
      return qb;
    },
    where: (column: any, op?: string, value?: any) => {
      if (typeof column === 'function') return qb; // разрез: в фикстуре не задан
      const at = (row: any) => legDate(row);
      if (op === '<') filters.push((row) => at(row) < value);
      if (op === '<=') filters.push((row) => at(row) <= value);
      if (op === '>=') filters.push((row) => at(row) >= value);
      return qb;
    },
    modify: (name: string, from?: string, to?: string) => {
      if (name === 'filterDateRange') {
        if (from) filters.push((row) => legDate(row) >= from);
        if (to) filters.push((row) => legDate(row) <= to);
      }
      return qb;
    },
  };
  build(qb);

  const found = rows.filter((row) => filters.every((keep) => keep(row)));
  if (!aggregate) return found;

  return [
    {
      debit: found.reduce((sum, row) => sum + Number(row.debit || 0), 0),
      credit: found.reduce((sum, row) => sum + Number(row.credit || 0), 0),
    },
  ];
}

function makeService() {
  const accountModel = () => ({
    query: () => ({
      whereIn: (column: string, values: any[]) =>
        Promise.resolve(ACCOUNTS.filter((a: any) => values.includes(a[column]))),
      onBuild: (build: (qb: any) => void) =>
        Promise.resolve(runQuery(ACCOUNTS, build)),
    }),
  });
  const accountTransactionModel = () => ({
    query: () => ({
      onBuild: (build: (qb: any) => void) =>
        Promise.resolve(runQuery(LEGS, build)),
    }),
  });
  const rollup = new ArticlesCashflowRollupService(
    (() => ({
      query: () => ({ orderBy: () => Promise.resolve(ARTICLES) }),
    })) as any,
    (() => ({ query: () => Promise.resolve(MAP) })) as any,
    accountModel as any,
    accountTransactionModel as any,
  );
  const meta = { meta: async () => ({}) };

  return new CashFlowArticlesService(
    rollup,
    meta as any,
    accountModel as any,
    accountTransactionModel as any,
  );
}

const RANGE = { fromDate: '2021-01-01', toDate: '2022-05-31' };
const i18n = { t: (key: string) => key } as any;

/** Таблица → «ключ строки → ячейки по ключу колонки». */
function cellsByRow(data: any, showTotalColumn = true) {
  const table = new CashFlowArticlesTable(data, i18n, showTotalColumn);
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
