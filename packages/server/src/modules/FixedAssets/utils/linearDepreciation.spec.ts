// © 2026 Bigfin
import { linearDepreciation } from './linearDepreciation';

describe('linearDepreciation', () => {
  it('равные доли, старт со следующего месяца после ввода (ПБУ 6/01)', () => {
    const rows = linearDepreciation({
      cost: 600000,
      salvageValue: 0,
      serviceLifeMonths: 60,
      commissionedAt: '2026-03-15',
    });
    expect(rows).toHaveLength(60);
    expect(rows[0]).toEqual({ seqNo: 1, period: '2026-04', amount: 10000 });
    expect(rows[1].period).toBe('2026-05');
    expect(rows[59].period).toBe('2031-03');
  });

  it('учитывает ликвидационную стоимость в базе амортизации', () => {
    const rows = linearDepreciation({
      cost: 100000,
      salvageValue: 10000,
      serviceLifeMonths: 9,
      commissionedAt: '2026-01-31',
    });
    expect(rows[0]).toEqual({ seqNo: 1, period: '2026-02', amount: 10000 });
    expect(rows).toHaveLength(9);
  });

  it('остаток округления добавляется к последнему месяцу (сумма = база)', () => {
    const rows = linearDepreciation({
      cost: 100000,
      salvageValue: 0,
      serviceLifeMonths: 3,
      commissionedAt: '2026-01-10',
    });
    const total = rows.reduce((s, r) => s + r.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(100000);
    expect(rows[0].amount).toBe(33333.33);
    expect(rows[2].amount).toBe(33333.34);
  });
});
