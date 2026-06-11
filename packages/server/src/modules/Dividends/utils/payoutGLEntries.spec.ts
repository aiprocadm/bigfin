// © 2026 Bigfin
import { getDividendPayoutGLEntries } from './payoutGLEntries';

describe('getDividendPayoutGLEntries', () => {
  const input = {
    id: 7,
    date: '2026-06-11',
    amount: 150000,
    currencyCode: 'RUB',
    equityAccountId: 31,
    paymentAccountId: 5,
    note: 'Дивиденды за II квартал',
  };

  it('дебет equity-счёта, кредит денежного — сбалансированы', () => {
    const entries = getDividendPayoutGLEntries(input);

    expect(entries).toHaveLength(2);

    const [equity, cash] = entries;
    expect(equity.accountId).toBe(31);
    expect(equity.debit).toBe(150000);
    expect(equity.credit).toBe(0);
    expect(equity.accountNormal).toBe('credit');

    expect(cash.accountId).toBe(5);
    expect(cash.credit).toBe(150000);
    expect(cash.debit).toBe(0);
    expect(cash.accountNormal).toBe('debit');

    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });

  it('ссылка на источник: DividendPayout + id выплаты', () => {
    const entries = getDividendPayoutGLEntries(input);

    entries.forEach((e) => {
      expect(e.transactionType).toBe('DividendPayout');
      expect(e.transactionId).toBe(7);
      expect(e.currencyCode).toBe('RUB');
      expect(e.date).toBe('2026-06-11');
    });
  });

  it('note отсутствует → undefined (не null)', () => {
    const entries = getDividendPayoutGLEntries({ ...input, note: null });
    expect(entries[0].note).toBeUndefined();
  });
});
