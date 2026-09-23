// © 2026 Bigfin
import { findAccrualShifts } from './findAccrualShifts';

/** «Месяц начисления вне периода» (FT-013 ТЗ-3, критерий 3). */
describe('месяц начисления вне периода', () => {
  const rows = [
    // Оплачена в январе, начислена в декабре прошлого года — в прибыли года её нет.
    { id: 1, date: '2026-01-05', accrualPeriod: '2025-12', amount: 5000 },
    // Оплачена и начислена внутри года — расхождения нет.
    { id: 2, date: '2026-03-10', accrualPeriod: '2026-02', amount: 700 },
    // Начислена в декабре, оплачена в следующем январе — в деньгах года её нет.
    { id: 3, date: new Date(2027, 0, 10), accrualPeriod: '2026-12', amount: 900 },
    // Без месяца начисления — не наш случай.
    { id: 4, date: '2026-05-01', accrualPeriod: null as any, amount: 1 },
  ];

  it('находит операции, у которых один из двух месяцев выходит за период', () => {
    const { items, count } = findAccrualShifts(rows, '2026-01-01', '2026-12-31');

    expect(count).toBe(2);
    expect(items.map((item) => [item.id, item.kind])).toEqual([
      [1, 'out'],
      [3, 'in'],
    ]);
    expect(items[1].date).toBe('2027-01-10');
  });

  it('критерий 2: если ни одна не выходит за год — список пуст (ДДС и ОПиУ сходятся)', () => {
    expect(findAccrualShifts([rows[1], rows[3]], '2026-01-01', '2026-12-31').count).toBe(0);
  });
});
