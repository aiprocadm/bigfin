// © 2026 Bigfin
import { allocatePool } from './allocatePool';

describe('allocatePool', () => {
  it('splits proportionally to weights', () => {
    const r = allocatePool(100, [
      { dealId: 1, weight: 3 },
      { dealId: 2, weight: 1 },
    ]);
    expect(r).toEqual([
      { dealId: 1, amount: 75 },
      { dealId: 2, amount: 25 },
    ]);
  });

  it('keeps the sum exactly equal to the pool (largest-remainder)', () => {
    const r = allocatePool(100, [
      { dealId: 1, weight: 1 },
      { dealId: 2, weight: 1 },
      { dealId: 3, weight: 1 },
    ]);
    const total = r.reduce((s, x) => s + x.amount, 0);
    expect(Number(total.toFixed(2))).toBe(100);
    expect(r[0].amount).toBe(33.34);
  });

  it('returns empty when total weight is zero or negative', () => {
    expect(allocatePool(100, [{ dealId: 1, weight: 0 }])).toEqual([]);
    expect(allocatePool(100, [])).toEqual([]);
  });

  it('ignores negative weights (treated as zero)', () => {
    const r = allocatePool(50, [
      { dealId: 1, weight: -5 },
      { dealId: 2, weight: 5 },
    ]);
    expect(r).toEqual([{ dealId: 2, amount: 50 }]);
  });
});
