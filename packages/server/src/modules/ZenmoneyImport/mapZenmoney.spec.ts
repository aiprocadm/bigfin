import { mapZenmoneyTransaction } from './mapZenmoney';

describe('mapZenmoneyTransaction', () => {
  it('приход (income>0) → положительная сумма', () => {
    const tx = {
      id: 'tx-1',
      date: '2026-05-31',
      income: 15000,
      outcome: 0,
      payee: 'ООО Ромашка',
      comment: 'Оплата',
    };
    expect(mapZenmoneyTransaction(tx)).toEqual({
      date: '2026-05-31',
      amount: 15000,
      payee: 'ООО Ромашка',
      description: 'Оплата',
      externalId: 'zenmoney:tx-1',
    });
  });

  it('расход (outcome>0) → отрицательная сумма', () => {
    const r = mapZenmoneyTransaction({ id: 2, date: '2026-06-01', income: 0, outcome: 5000 });
    expect(r.amount).toBe(-5000);
    expect(r.externalId).toBe('zenmoney:2');
    expect(r.payee).toBeNull();
    expect(r.description).toBeNull();
  });
});
