// © 2026 Bigfin
import {
  computeDividendsSummary,
  computeNetProfit,
  sumPayouts,
  sumUnpaidBills,
} from './dividendsMath';

describe('dividendsMath', () => {
  describe('computeNetProfit', () => {
    const accounts = [
      { id: 1, accountType: 'income' },
      { id: 2, accountType: 'expense' },
      { id: 3, accountType: 'cost-of-goods-sold' },
      { id: 4, accountType: 'other-income' },
    ];

    it('доходы по нормали credit, расходы по нормали debit', () => {
      const rows = [
        { accountId: 1, credit: 1000, debit: 100 }, // income net +900
        { accountId: 2, credit: 50, debit: 350 }, // expense net −300
        { accountId: 3, credit: 0, debit: 200 }, // COGS net −200
        { accountId: 4, credit: 100, debit: 0 }, // other income +100
      ];
      expect(computeNetProfit(rows, accounts)).toBe(500);
    });

    it('неизвестный счёт и NaN-значения не ломают расчёт', () => {
      const rows = [
        { accountId: 99, credit: 1000, debit: 0 }, // нет в справочнике
        { accountId: 1, credit: 'abc', debit: undefined }, // NaN-safe → 0
        { accountId: 1, credit: '250.5', debit: '0' }, // строки из SQL
      ];
      expect(computeNetProfit(rows as any, accounts)).toBe(250.5);
    });

    it('пустые входы дают 0', () => {
      expect(computeNetProfit([], [])).toBe(0);
    });

    it('убыток даёт отрицательную прибыль', () => {
      const rows = [{ accountId: 2, credit: 0, debit: 700 }];
      expect(computeNetProfit(rows, accounts)).toBe(-700);
    });
  });

  describe('sumPayouts', () => {
    it('суммирует выплаты NaN-safe', () => {
      expect(
        sumPayouts([{ amount: 100 }, { amount: '50.25' }, { amount: null }]),
      ).toBe(150.25);
    });
  });

  describe('sumUnpaidBills', () => {
    it('dueAmount × курс, курс по умолчанию 1', () => {
      expect(
        sumUnpaidBills([
          { dueAmount: 100, exchangeRate: 2 },
          { dueAmount: 50 },
          { dueAmount: 'x', exchangeRate: 1 },
        ]),
      ).toBe(250);
    });
  });

  describe('computeDividendsSummary', () => {
    it('available = прибыль − выведено; safe = available − кредиторка', () => {
      const res = computeDividendsSummary({
        netProfit: 1000,
        totalPaidOut: 300,
        unpaidBills: 200,
      });
      expect(res).toEqual({
        netProfit: 1000,
        totalPaidOut: 300,
        available: 700,
        unpaidBills: 200,
        safe: 500,
      });
    });

    it('safe может быть отрицательным — знак не маскируется', () => {
      const res = computeDividendsSummary({
        netProfit: 100,
        totalPaidOut: 0,
        unpaidBills: 250,
      });
      expect(res.available).toBe(100);
      expect(res.safe).toBe(-150);
    });

    it('NaN-входы превращаются в 0', () => {
      const res = computeDividendsSummary({
        netProfit: undefined,
        totalPaidOut: 'abc',
        unpaidBills: null,
      });
      expect(res).toEqual({
        netProfit: 0,
        totalPaidOut: 0,
        available: 0,
        unpaidBills: 0,
        safe: 0,
      });
    });
  });
});
