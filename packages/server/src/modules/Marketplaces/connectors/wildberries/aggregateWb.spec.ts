import { aggregateWbReport } from './aggregateWb';

describe('aggregateWbReport', () => {
  it('суммирует выручку, к перечислению, логистику, штрафы, хранение', () => {
    const rows = [
      {
        retail_amount: 1000,
        ppvz_for_pay: 800,
        delivery_rub: 50,
        penalty: 10,
        storage_fee: 5,
      },
      {
        retail_amount: 2000,
        ppvz_for_pay: 1600,
        delivery_rub: 100,
        penalty: 0,
        storage_fee: 15,
      },
    ];
    const s = aggregateWbReport(rows);
    expect(s.revenue).toBe(3000);
    expect(s.toPay).toBe(2400);
    expect(s.deductions).toBe(600); // 3000 − 2400
    expect(s.logistics).toBe(150);
    expect(s.penalties).toBe(10);
    expect(s.storage).toBe(20);
  });

  it('пустой отчёт → нули', () => {
    expect(aggregateWbReport([])).toEqual({
      revenue: 0,
      toPay: 0,
      deductions: 0,
      logistics: 0,
      penalties: 0,
      storage: 0,
    });
  });

  it('игнорирует отсутствующие/нечисловые поля', () => {
    const s = aggregateWbReport([{ retail_amount: '500', ppvz_for_pay: null }]);
    expect(s.revenue).toBe(500);
    expect(s.toPay).toBe(0);
    expect(s.deductions).toBe(500);
  });
});
