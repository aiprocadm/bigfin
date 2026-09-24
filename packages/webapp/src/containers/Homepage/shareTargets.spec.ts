import { describe, expect, it } from 'vitest';

import { parseTarget, shareStatus } from './shareTargets';

/** Доли в выручке против своей цели (FT-065 ТЗ-3). */
describe('shareStatus', () => {
  it('выручки нет — процента нет, даже при цели', () => {
    expect(shareStatus(null, 30)).toEqual({ kind: 'no_revenue' });
    expect(shareStatus(undefined, null)).toEqual({ kind: 'no_revenue' });
  });

  it('цели нет — доля без оценки', () => {
    expect(shareStatus(42, null)).toEqual({ kind: 'no_target' });
  });

  it('выше цели — на сколько пунктов', () => {
    expect(shareStatus(42.5, 38)).toEqual({ kind: 'over', by: 4.5 });
  });

  it('ровно на цели и ниже — в пределах', () => {
    expect(shareStatus(35, 35)).toEqual({ kind: 'within' });
    expect(shareStatus(20, 35)).toEqual({ kind: 'within' });
    // Сотые, которых не видно на экране, не подсвечивают долю.
    expect(shareStatus(35.04, 35)).toEqual({ kind: 'within' });
  });
});

describe('parseTarget', () => {
  it('пустое, мусор и отрицательное — цели нет', () => {
    expect(parseTarget(undefined)).toBeNull();
    expect(parseTarget(null)).toBeNull();
    expect(parseTarget(Number.NaN)).toBeNull();
    expect(parseTarget(-5)).toBeNull();
  });

  it('число округляется до десятой', () => {
    expect(parseTarget(35)).toBe(35);
    expect(parseTarget(12.345)).toBe(12.3);
  });
});
