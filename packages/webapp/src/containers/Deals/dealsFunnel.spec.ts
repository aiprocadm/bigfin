import { describe, expect, it } from 'vitest';
import { dealsFunnel, marginOf } from './dealsFunnel';

describe('воронка сделок', () => {
  it('ступени по пути сделки: в работе → завершена → отменена; число и суммы', () => {
    const steps = dealsFunnel([
      { status: 'completed', revenue: 100, profit: 30 },
      { status: 'in_progress', revenue: 50, profit: 10 },
      { status: 'completed', revenue: 200, profit: 50 },
      { status: 'cancelled', revenue: 0, profit: -5 },
    ]);
    expect(steps.map((s) => s.status)).toEqual(['in_progress', 'completed', 'cancelled']);
    expect(steps[1]).toEqual({ status: 'completed', count: 2, revenue: 300, profit: 80 });
    expect(steps[0].count).toBe(1);
  });

  it('пустая ступень остаётся нулевой, неизвестный статус не попадает никуда', () => {
    const steps = dealsFunnel([{ status: 'draft', revenue: 999 }]);
    expect(steps.every((s) => s.count === 0 && s.revenue === 0)).toBe(true);
  });

  it('рентабельность при нулевой выручке — нет, а не 0 %', () => {
    expect(marginOf(0, -10)).toBeNull();
    expect(marginOf(200, 50)).toBe(0.25);
  });
});
