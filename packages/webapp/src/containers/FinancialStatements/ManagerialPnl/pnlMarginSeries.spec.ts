import { describe, expect, it } from 'vitest';

import { hasMarginSeries, pnlMarginSeries } from './pnlMarginSeries';

const columns = [
  { key: 'name' },
  { key: 'p0', label: 'янв.' },
  { key: 'p1', label: 'февр.' },
  { key: 'total', label: 'Итого', isTotal: true },
];
const rows = [
  { id: 'md_margin', cells: [{ value: 'МД %' }, { value: '40.5' }, { value: '' }, { value: '38' }] },
  { id: 'np_margin', cells: [{ value: 'ЧП %' }, { value: '12' }, { value: '-3' }, { value: '5' }] },
];

describe('рентабельность по ярусам во времени (C9)', () => {
  it('точки — по колонкам периодов, без «Итого»; пустая ячейка — разрыв', () => {
    const points = pnlMarginSeries(rows, columns);
    expect(points.map((p) => p.label)).toEqual(['янв.', 'февр.']);
    expect(points[0].md_margin).toBe(40.5);
    expect(points[1].md_margin).toBeNull();
    expect(points[1].np_margin).toBe(-3);
    // Ряда нет в отчёте — точки пустые, а не нули.
    expect(points[0].op_margin).toBeNull();
  });

  it('рисовать есть что, только если у ряда две точки', () => {
    expect(hasMarginSeries(pnlMarginSeries(rows, columns))).toBe(true);
    expect(hasMarginSeries(pnlMarginSeries(rows, columns.slice(0, 2)))).toBe(false);
  });
});
