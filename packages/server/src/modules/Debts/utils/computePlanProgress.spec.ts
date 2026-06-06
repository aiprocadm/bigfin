// © 2026 Bigfin
import { computePlanProgress } from './computePlanProgress';

describe('computePlanProgress', () => {
  const at = '2026-06-05';

  it('считает оплачено/осталось/процент и следующий платёж', () => {
    const res = computePlanProgress(
      [
        { amount: 100, status: 'paid', dueDate: '2026-05-01' },
        { amount: 100, status: 'planned', dueDate: '2026-07-01' },
        { amount: 100, status: 'planned', dueDate: '2026-08-01' },
      ],
      at,
    );
    expect(res.plannedTotal).toBe(300);
    expect(res.paidTotal).toBe(100);
    expect(res.remaining).toBe(200);
    expect(res.percentPaid).toBeCloseTo(33.333, 2);
    expect(res.nextDueDate).toBe('2026-07-01');
    expect(res.isOverdue).toBe(false);
  });

  it('помечает просрочку, если есть запланированный платёж в прошлом', () => {
    const res = computePlanProgress(
      [{ amount: 100, status: 'planned', dueDate: '2026-05-01' }],
      at,
    );
    expect(res.isOverdue).toBe(true);
    expect(res.nextDueDate).toBe('2026-05-01');
  });

  it('пустой график — нули, нет следующего платежа', () => {
    const res = computePlanProgress([], at);
    expect(res).toEqual({
      plannedTotal: 0,
      paidTotal: 0,
      remaining: 0,
      percentPaid: 0,
      nextDueDate: null,
      isOverdue: false,
    });
  });

  it('полностью оплачено — 100% и нет следующего', () => {
    const res = computePlanProgress(
      [{ amount: 100, status: 'paid', dueDate: '2026-05-01' }],
      at,
    );
    expect(res.percentPaid).toBe(100);
    expect(res.remaining).toBe(0);
    expect(res.nextDueDate).toBeNull();
  });
});
