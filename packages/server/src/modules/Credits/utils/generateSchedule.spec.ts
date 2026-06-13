// © 2026 Bigfin
import { generateSchedule } from './generateSchedule';

const sumPrincipal = (rows: any[]) =>
  Math.round(rows.reduce((s, r) => s + r.principalAmount, 0) * 100) / 100;

describe('generateSchedule', () => {
  it('аннуитет без процентов: равные доли тела, остаток гасится в ноль', () => {
    const rows = generateSchedule({
      principal: 120000,
      annualRate: 0,
      termMonths: 12,
      startDate: '2026-01-15',
      scheduleType: 'annuity',
    });
    expect(rows).toHaveLength(12);
    expect(rows[0].interestAmount).toBe(0);
    expect(rows[0].paymentAmount).toBe(10000);
    expect(sumPrincipal(rows)).toBe(120000);
    expect(rows[11].remainingBalance).toBe(0);
  });

  it('аннуитет с процентами: сумма тел равна телу кредита, остаток ноль', () => {
    const rows = generateSchedule({
      principal: 100000,
      annualRate: 18,
      termMonths: 6,
      startDate: '2026-01-31',
      scheduleType: 'annuity',
    });
    expect(rows).toHaveLength(6);
    expect(sumPrincipal(rows)).toBe(100000);
    expect(rows[5].remainingBalance).toBe(0);
    expect(rows[0].interestAmount).toBe(1500);
  });

  it('дифференцированный: тело равными долями, платёж убывает', () => {
    const rows = generateSchedule({
      principal: 120000,
      annualRate: 12,
      termMonths: 12,
      startDate: '2026-01-10',
      scheduleType: 'differentiated',
    });
    expect(rows[0].principalAmount).toBe(10000);
    expect(rows[0].interestAmount).toBe(1200);
    expect(rows[0].paymentAmount).toBeGreaterThan(rows[11].paymentAmount);
    expect(sumPrincipal(rows)).toBe(120000);
    expect(rows[11].remainingBalance).toBe(0);
  });

  it('срок 1 месяц: одна строка, тело = весь кредит', () => {
    const rows = generateSchedule({
      principal: 50000,
      annualRate: 12,
      termMonths: 1,
      startDate: '2026-03-01',
      scheduleType: 'annuity',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].principalAmount).toBe(50000);
    expect(rows[0].remainingBalance).toBe(0);
    expect(rows[0].dueDate).toBe('2026-04-01');
  });
});
