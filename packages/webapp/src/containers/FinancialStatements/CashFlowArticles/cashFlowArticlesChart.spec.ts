import { describe, expect, it } from 'vitest';

import { hasPeriodMovement, periodChartSeries } from './cashFlowArticlesChart';

/**
 * Ряды графика «Деньги по статьям» — по периодам (FT-001 ТЗ-3).
 *
 * Главное свойство — числа графика РАВНЫ числам таблицы, потому что берутся
 * из её же строк.
 */
const COLUMNS = [
  { key: 'name', label: 'Статья', cellIndex: 0 },
  { key: 'p0', label: 'янв. 2026', cellIndex: 1 },
  { key: 'p1', label: 'февр. 2026', cellIndex: 2 },
  { key: 'total', label: 'Итого', cellIndex: 3 },
];

/** Вид строки — как у сервера: группы узнаются по нему, а не по ключу. */
const TYPES: Record<string, string> = {
  'inflow-operating': 'INFLOW',
  'outflow-operating': 'OUTFLOW',
  'inflow-financing': 'INFLOW',
  'outflow-financing': 'OUTFLOW',
  'section-operating': 'SECTION',
  'section-financing': 'SECTION',
  'transfers-in': 'TRANSFER_IN',
};

const r = (id: string, values: number[], children: any[] = []) => ({
  id,
  cells: [{ key: 'name', value: id }, ...values.map((v) => ({ key: 'x', value: String(v) }))],
  row_types: [TYPES[id] ?? (id.startsWith('article') ? 'ARTICLE' : id.toUpperCase())],
  children,
});

const ROWS = [
  r('opening', [1000, 1500, 1000]),
  r('section-operating', [500, -200, 300], [
    r('inflow-operating', [800, 100, 900], [r('article-1', [800, 100, 900])]),
    r('outflow-operating', [300, 300, 600], [r('article-2', [300, 300, 600])]),
  ]),
  r('section-financing', [0, 0, 0], [
    r('inflow-financing', [0, 50, 50]),
    r('outflow-financing', [0, 0, 0]),
  ]),
  r('net', [500, -150, 350]),
  r('closing', [1500, 1350, 1350]),
  r('transfers', [0, 0, 0], [r('transfers-in', [70, 0, 70])]),
];

describe('ряды графика отчёта «Деньги» по периодам', () => {
  it('точка на каждый период, без «Итого»', () => {
    expect(periodChartSeries(COLUMNS, ROWS).map((p) => p.key)).toEqual([
      'p0',
      'p1',
    ]);
  });

  it('поступления и выплаты — сумма групп всех разделов, как в таблице', () => {
    expect(periodChartSeries(COLUMNS, ROWS)).toEqual([
      { key: 'p0', label: 'янв. 2026', inflow: 800, outflow: 300, net: 500 },
      { key: 'p1', label: 'февр. 2026', inflow: 150, outflow: 300, net: -150 },
    ]);
  });

  it('статьи не складываются второй раз поверх групп', () => {
    // article-1 лежит внутри inflow-operating: сложи мы и её — январь дал бы 1600.
    expect(periodChartSeries(COLUMNS, ROWS)[0].inflow).toBe(800);
  });

  it('переводы между своими счетами на график не попадают', () => {
    expect(periodChartSeries(COLUMNS, ROWS)[0].inflow).not.toBe(870);
  });

  it('группы внутри направлений тоже складываются (вкладка «направления и статьи»)', () => {
    const rows = [
      {
        id: 'direction-3',
        cells: [{ key: 'name', value: 'Кофейня' }, { key: 'x', value: '0' }, { key: 'x', value: '0' }, { key: 'x', value: '0' }],
        row_types: ['DIRECTION'],
        children: [
          { id: 'direction-3-inflow', cells: [{ key: 'n', value: '' }, { key: 'x', value: '10' }, { key: 'x', value: '0' }, { key: 'x', value: '10' }], row_types: ['INFLOW'], children: [] },
        ],
      },
      {
        id: 'direction-none',
        cells: [{ key: 'name', value: 'Без' }, { key: 'x', value: '0' }, { key: 'x', value: '0' }, { key: 'x', value: '0' }],
        row_types: ['DIRECTION'],
        children: [
          { id: 'direction-none-inflow', cells: [{ key: 'n', value: '' }, { key: 'x', value: '5' }, { key: 'x', value: '1' }, { key: 'x', value: '6' }], row_types: ['INFLOW'], children: [] },
        ],
      },
    ];

    expect(periodChartSeries(COLUMNS, rows).map((p) => p.inflow)).toEqual([15, 1]);
  });

  it('движения нет — графика нет', () => {
    const quiet = [r('section-operating', [0, 0, 0], [r('inflow-operating', [0, 0, 0])])];

    expect(hasPeriodMovement(periodChartSeries(COLUMNS, quiet))).toBe(false);
    expect(hasPeriodMovement(periodChartSeries(COLUMNS, ROWS))).toBe(true);
  });

  it('пустые строки не роняют разбор', () => {
    expect(periodChartSeries(COLUMNS, [])).toEqual([
      { key: 'p0', label: 'янв. 2026', inflow: 0, outflow: 0, net: 0 },
      { key: 'p1', label: 'февр. 2026', inflow: 0, outflow: 0, net: 0 },
    ]);
    expect(hasPeriodMovement()).toBe(false);
  });

  it('у графика НЕТ своего запроса за данными', () => {
    // Второй источник тех же сумм — то, что прежнее ТЗ запретило прямо.
    // Сторож против возврата: ряд обязан собираться из строк таблицы.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, 'cashFlowArticlesChart.ts'),
      'utf8',
    );

    expect(source).not.toContain('useQuery');
    expect(source).not.toContain('apiRequest');
  });
});
