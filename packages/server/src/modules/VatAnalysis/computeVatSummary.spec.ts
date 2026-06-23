import { computeVatSummary, stripVat } from './computeVatSummary';

describe('computeVatSummary', () => {
  it('начислен = кредиты, к вычету = дебеты, к уплате = разница', () => {
    const s = computeVatSummary([
      { accountId: 1, accountName: 'НДС 20%', credit: 20000, debit: 8000 },
      { accountId: 2, accountName: 'НДС 10%', credit: 5000, debit: 1000 },
    ]);
    expect(s.charged).toBe(25000);
    expect(s.deductible).toBe(9000);
    expect(s.payable).toBe(16000);
    expect(s.byAccount).toHaveLength(2);
    expect(s.byAccount[0]).toEqual({
      accountId: 1,
      accountName: 'НДС 20%',
      charged: 20000,
      deductible: 8000,
    });
  });

  it('вычет больше начисленного → к уплате отрицательный (к возмещению)', () => {
    const s = computeVatSummary([
      { accountId: 1, accountName: 'НДС', credit: 3000, debit: 5000 },
    ]);
    expect(s.payable).toBe(-2000);
  });

  it('пустой период → нули', () => {
    const s = computeVatSummary([]);
    expect(s).toEqual({ charged: 0, deductible: 0, payable: 0, byAccount: [] });
  });
});

describe('stripVat', () => {
  it('выделяет НДS 20% из суммы с налогом', () => {
    const { net, vat } = stripVat(120, 20);
    expect(net).toBeCloseTo(100);
    expect(vat).toBeCloseTo(20);
  });

  it('ставка 0 → весь как net, НДС 0', () => {
    expect(stripVat(100, 0)).toEqual({ net: 100, vat: 0 });
  });
});
