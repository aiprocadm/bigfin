import { describe, expect, it } from 'vitest';

import { hasWaterfall, pnlWaterfall } from './pnlWaterfall';

/**
 * Водопад управленческой прибыли (FT-015 ТЗ-3): ступени сходятся с
 * итогами ярусов, потому что строятся из тех же строк.
 */
const VALUES: Record<string, number> = {
  revenue: 1000,
  direct_variable: 100,
  md: 900,
  direct_production: 200,
  gp1: 700,
  overhead_production: 50,
  gp2: 650,
  administrative: 150,
  commercial: 100,
  op: 400,
  other_income_below_ebitda: 30,
  below_ebitda: 80,
  np: 350,
};
const steps = pnlWaterfall((id) => VALUES[id] ?? 0);
const byId = (id: string) => steps.find((step) => step.id === id)!;

describe('водопад прибыли', () => {
  it('расход висит от предыдущего уровня вниз', () => {
    // От выручки 1000 вниз на 100: столбик от 900 до 1000.
    expect(byId('direct_variable')).toMatchObject({ value: -100, base: 900, height: 100 });
    // Административные: от ВП2 650 вниз на 150 — от 500 до 650.
    expect(byId('administrative')).toMatchObject({ base: 500, height: 150 });
  });

  it('итоги ярусов стоят от нуля и совпадают с таблицей', () => {
    expect(byId('md')).toMatchObject({ kind: 'total', base: 0, height: 900 });
    expect(byId('np')).toMatchObject({ kind: 'total', base: 0, height: 350 });
  });

  it('доходы ниже EBITDA поднимают уровень', () => {
    expect(byId('other_income_below_ebitda')).toMatchObject({ value: 30, base: 400, height: 30 });
  });

  it('подпись — доля от выручки', () => {
    expect(byId('gp1').shareOfRevenue).toBe(70);
    expect(byId('administrative').shareOfRevenue).toBe(-15);
  });

  it('убыток: итог ниже нуля рисуется вниз от нуля', () => {
    const loss = pnlWaterfall((id) => ({ revenue: 100, administrative: 300, op: -200, np: -200, md: 100, gp1: 100, gp2: 100 } as any)[id] ?? 0);
    expect(loss.find((s) => s.id === 'np')).toMatchObject({ base: -200, height: 200 });
  });

  it('без выручки доля не определена; пустой водопад не рисуется', () => {
    const empty = pnlWaterfall(() => 0);
    expect(empty[0].shareOfRevenue).toBeNull();
    expect(hasWaterfall(empty)).toBe(false);
    expect(hasWaterfall(steps)).toBe(true);
  });
});
