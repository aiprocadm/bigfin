// © 2026 Bigfin
import { summarizeRun } from './summarizeRun';

describe('summarizeRun', () => {
  it('суммирует строки', () => {
    const totals = summarizeRun([
      { ndflAmount: 13000, contributionsAmount: 30000, netAmount: 87000, totalCost: 130000 },
      { ndflAmount: 6500, contributionsAmount: 15000, netAmount: 43500, totalCost: 65000 },
    ] as any);
    expect(totals).toEqual({
      totalNdfl: 19500,
      totalContributions: 45000,
      totalNet: 130500,
      totalCost: 195000,
    });
  });

  it('пустой список → нули', () => {
    expect(summarizeRun([])).toEqual({
      totalNdfl: 0,
      totalContributions: 0,
      totalNet: 0,
      totalCost: 0,
    });
  });

  it('NaN-safe', () => {
    const totals = summarizeRun([{ ndflAmount: 'x' } as any]);
    expect(totals.totalNdfl).toBe(0);
  });
});
