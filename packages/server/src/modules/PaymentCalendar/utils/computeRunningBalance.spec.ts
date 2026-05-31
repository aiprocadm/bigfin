import { computeRunningBalance } from './computeRunningBalance';

describe('computeRunningBalance', () => {
  it('accumulates the balance day by day', () => {
    const res = computeRunningBalance(100, [
      { date: '2026-06-01', inflow: 50, outflow: 0 },
      { date: '2026-06-02', inflow: 0, outflow: 30 },
    ]);
    expect(res.days.map((d) => d.balance)).toEqual([150, 120]);
    expect(res.gap).toBeNull();
  });

  it('detects the first cash gap (balance < 0)', () => {
    const res = computeRunningBalance(100, [
      { date: '2026-06-01', inflow: 0, outflow: 50 },
      { date: '2026-06-02', inflow: 0, outflow: 80 }, // 50 - 80 = -30
      { date: '2026-06-03', inflow: 0, outflow: 10 },
    ]);
    expect(res.gap).toEqual({
      date: '2026-06-02',
      amount: 30,
      daysFromStart: 1,
    });
  });

  it('reports a gap on the very first day', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 5 },
    ]);
    expect(res.gap).toEqual({
      date: '2026-06-01',
      amount: 5,
      daysFromStart: 0,
    });
  });

  it('avoids float drift (rounds to 3 decimals)', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0.1, outflow: 0 },
      { date: '2026-06-02', inflow: 0.2, outflow: 0 },
    ]);
    expect(res.days[1].balance).toBe(0.3);
  });
});
