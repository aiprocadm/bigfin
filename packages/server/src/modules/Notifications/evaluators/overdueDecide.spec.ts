// © 2026 Bigfin
import { overdueDecide } from './overdueDecide';

describe('overdueDecide', () => {
  it('нет просроченных счетов → нет кандидата', () => {
    expect(overdueDecide([])).toHaveLength(0);
  });
  it('есть просроченные счета → один сводный кандидат с count и total', () => {
    const out = overdueDecide([
      { id: 1, amount: 1000, dueDate: '2026-06-01' },
      { id: 2, amount: 2500.5, dueDate: '2026-06-05' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].eventType).toBe('overdue');
    expect(out[0].payload.count).toBe(2);
    expect(out[0].payload.total).toBe(3500.5);
  });
  it('граница — один счёт → кандидат с total равным его сумме', () => {
    const out = overdueDecide([{ id: 99, amount: 777, dueDate: '2026-06-10' }]);
    expect(out).toHaveLength(1);
    expect(out[0].payload.total).toBe(777);
    expect(out[0].payload.top).toHaveLength(1);
  });
});
