import { aggregateYookassaPayments } from './aggregateYookassa';

describe('aggregateYookassaPayments', () => {
  it('суммирует успешные: gross, net, комиссия = gross−net', () => {
    const payments = [
      { status: 'succeeded', amount: { value: '1000.00' }, income_amount: { value: '965.00' } },
      { status: 'succeeded', amount: { value: '2000.00' }, income_amount: { value: '1930.00' } },
    ];
    const s = aggregateYookassaPayments(payments);
    expect(s.gross).toBe(3000);
    expect(s.net).toBe(2895);
    expect(s.commission).toBe(105);
    expect(s.count).toBe(2);
  });

  it('игнорирует неуспешные (canceled/pending)', () => {
    const s = aggregateYookassaPayments([
      { status: 'succeeded', amount: { value: '500' }, income_amount: { value: '480' } },
      { status: 'canceled', amount: { value: '999' } },
      { status: 'pending', amount: { value: '777' } },
    ]);
    expect(s.gross).toBe(500);
    expect(s.count).toBe(1);
  });

  it('нет income_amount → net = gross (комиссия 0)', () => {
    const s = aggregateYookassaPayments([
      { status: 'succeeded', amount: { value: '100' } },
    ]);
    expect(s.net).toBe(100);
    expect(s.commission).toBe(0);
  });

  it('пусто → нули', () => {
    expect(aggregateYookassaPayments([])).toEqual({
      gross: 0,
      net: 0,
      commission: 0,
      count: 0,
    });
  });
});
