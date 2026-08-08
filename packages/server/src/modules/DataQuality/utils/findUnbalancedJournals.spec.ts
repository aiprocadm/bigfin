// © 2026 Bigfin
import { findUnbalancedJournals } from './findUnbalancedJournals';

const row = (over: Record<string, any> = {}) => ({
  referenceType: 'SaleInvoice',
  referenceId: 1,
  date: '2026-07-25',
  debit: 0,
  credit: 0,
  transactionNumber: null,
  referenceNumber: null,
  ...over,
});

describe('findUnbalancedJournals', () => {
  it('сходящийся документ в выдачу не попадает', () => {
    const res = findUnbalancedJournals([
      row({ debit: 120000 }),
      row({ credit: 100000 }),
      row({ credit: 20000 }),
    ]);
    expect(res.journals).toHaveLength(0);
    expect(res.totalJournals).toBe(0);
    expect(res.totalDifference).toBe(0);
  });

  // Ровно тот перекос, который приёмка нашла вживую до починки #188.
  it('счёт с НДС «сверху» до починки: дебет 100 000 против кредита 120 000', () => {
    const res = findUnbalancedJournals([
      row({ debit: 100000 }),
      row({ credit: 100000 }),
      row({ credit: 20000 }),
    ]);
    expect(res.journals).toHaveLength(1);
    expect(res.journals[0].difference).toBe(-20000);
    expect(res.journals[0].debit).toBe(100000);
    expect(res.journals[0].credit).toBe(120000);
    expect(res.journals[0].entriesCount).toBe(3);
    expect(res.totalDifference).toBe(20000);
  });

  it('документы разных типов считаются раздельно', () => {
    const res = findUnbalancedJournals([
      row({ referenceType: 'SaleInvoice', referenceId: 1, debit: 100 }),
      row({ referenceType: 'Bill', referenceId: 1, credit: 100 }),
    ]);
    // Каждый документ перекошен сам по себе, хотя вместе они «сходятся».
    expect(res.totalJournals).toBe(2);
  });

  it('копеечные хвосты расхождением не считаются', () => {
    const res = findUnbalancedJournals([
      row({ debit: 8333.334 }),
      row({ credit: 8333.33 }),
    ]);
    expect(res.journals).toHaveLength(0);
  });

  it('крупные перекосы идут первыми, выдача ограничена', () => {
    const rows = [
      row({ referenceId: 1, debit: 10 }),
      row({ referenceId: 2, debit: 1000 }),
      row({ referenceId: 3, debit: 100 }),
    ];
    const res = findUnbalancedJournals(rows, 2);
    expect(res.journals.map((j) => j.referenceId)).toEqual([2, 3]);
    expect(res.totalJournals).toBe(3);
    expect(res.totalDifference).toBe(1110);
  });

  it('номер документа подхватывается из любой строки журнала', () => {
    const res = findUnbalancedJournals([
      row({ debit: 100 }),
      row({ transactionNumber: 'INV-7' }),
    ]);
    expect(res.journals[0].documentNumber).toBe('INV-7');
  });

  it('строки без документа игнорируются, суммы устойчивы к мусору', () => {
    const res = findUnbalancedJournals([
      row({ referenceType: null as any, debit: 999 }),
      row({ referenceId: null as any, debit: 999 }),
      row({ debit: 'мусор' as any, credit: 100 }),
    ]);
    expect(res.totalJournals).toBe(1);
    expect(res.journals[0].difference).toBe(-100);
  });
});
