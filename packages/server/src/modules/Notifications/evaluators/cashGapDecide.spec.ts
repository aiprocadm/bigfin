// © 2026 Bigfin
import { cashGapDecide } from './cashGapDecide';

describe('cashGapDecide', () => {
  it('нет разрыва → нет кандидата', () => {
    expect(cashGapDecide(null, 7)).toHaveLength(0);
  });
  it('разрыв за горизонтом → нет', () => {
    expect(
      cashGapDecide({ date: '2026-07-01', amount: 100, daysFromStart: 20 }, 7),
    ).toHaveLength(0);
  });
  it('разрыв в горизонте → кандидат с payload', () => {
    const out = cashGapDecide(
      { date: '2026-06-20', amount: 5000, daysFromStart: 5 },
      7,
    );
    expect(out).toHaveLength(1);
    expect(out[0].payload.amount).toBe(5000);
  });
});
