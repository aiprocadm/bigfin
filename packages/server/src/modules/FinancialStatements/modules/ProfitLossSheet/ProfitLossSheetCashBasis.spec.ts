// © 2026 Bigfin
import {
  filterCashSettledLegs,
  totalCashLegsByAccount,
  periodsCashLegsByAccount,
} from './ProfitLossSheetCashBasis';

// 100 = расчётный счёт (bank), 200 = дебиторка, 300 = доход, 400 = расход.
const isCashAccount = (id: number) => id === 100;

describe('ProfitLossSheetCashBasis', () => {
  describe('filterCashSettledLegs', () => {
    it('исключает неоплаченный счёт покупателю (источник без ноги на денежном счёте)', () => {
      const legs = [
        // Неоплаченный счёт: дебиторка + доход, денег не было.
        { referenceType: 'SaleInvoice', referenceId: 1, accountId: 200, transactionType: null, credit: 0, debit: 1000, date: '2026-01-10' },
        { referenceType: 'SaleInvoice', referenceId: 1, accountId: 300, transactionType: null, credit: 1000, debit: 0, date: '2026-01-10' },
      ];
      expect(filterCashSettledLegs(legs, isCashAccount)).toEqual([]);
    });

    it('включает денежную операцию с расходной ногой (деньги реально ушли)', () => {
      const legs = [
        { referenceType: 'CashflowTransaction', referenceId: 2, accountId: 100, transactionType: 'OtherExpense', credit: 500, debit: 0, date: '2026-01-12' },
        { referenceType: 'CashflowTransaction', referenceId: 2, accountId: 400, transactionType: 'OtherExpense', credit: 0, debit: 500, date: '2026-01-12' },
      ];
      const result = filterCashSettledLegs(legs, isCashAccount);

      expect(result).toHaveLength(2);
      expect(result.map((leg) => leg.accountId)).toEqual([100, 400]);
    });

    it('исключает внутренний перевод между своими счетами', () => {
      const legs = [
        { referenceType: 'CashflowTransaction', referenceId: 3, accountId: 100, transactionType: 'TransferToAccount', credit: 700, debit: 0, date: '2026-01-15' },
        { referenceType: 'CashflowTransaction', referenceId: 3, accountId: 101, transactionType: 'TransferFromAccount', credit: 0, debit: 700, date: '2026-01-15' },
      ];
      expect(filterCashSettledLegs(legs, isCashAccount)).toEqual([]);
    });

    it('смешанный период: кассовые источники остаются, начисленные — нет', () => {
      const legs = [
        // Кассовый доход.
        { referenceType: 'CashflowTransaction', referenceId: 4, accountId: 100, transactionType: 'OtherIncome', credit: 0, debit: 2000, date: '2026-02-01' },
        { referenceType: 'CashflowTransaction', referenceId: 4, accountId: 300, transactionType: 'OtherIncome', credit: 2000, debit: 0, date: '2026-02-01' },
        // Неоплаченный счёт (только начисление).
        { referenceType: 'SaleInvoice', referenceId: 5, accountId: 200, transactionType: null, credit: 0, debit: 3000, date: '2026-02-02' },
        { referenceType: 'SaleInvoice', referenceId: 5, accountId: 300, transactionType: null, credit: 3000, debit: 0, date: '2026-02-02' },
      ];
      const result = filterCashSettledLegs(legs, isCashAccount);

      expect(result).toHaveLength(2);
      expect(result.every((leg) => leg.referenceId === 4)).toBe(true);
    });
  });

  describe('totalCashLegsByAccount', () => {
    it('суммирует кредит/дебет по каждому счёту (форма SQL-агрегации)', () => {
      const legs = [
        { referenceType: 'CashflowTransaction', referenceId: 1, accountId: 300, credit: 1000, debit: 0, date: '2026-01-01' },
        { referenceType: 'CashflowTransaction', referenceId: 2, accountId: 300, credit: 500, debit: 0, date: '2026-01-05' },
        { referenceType: 'Expense', referenceId: 3, accountId: 400, credit: 0, debit: 200, date: '2026-01-07' },
      ];
      expect(totalCashLegsByAccount(legs)).toEqual([
        { accountId: 300, credit: 1500, debit: 0 },
        { accountId: 400, credit: 0, debit: 200 },
      ]);
    });

    it('NaN-safe: отсутствующие суммы считаются нулями', () => {
      const legs = [
        { referenceType: 'Expense', referenceId: 1, accountId: 400, credit: null, debit: undefined, date: '2026-01-01' },
      ];
      expect(totalCashLegsByAccount(legs)).toEqual([
        { accountId: 400, credit: 0, debit: 0 },
      ]);
    });
  });

  describe('periodsCashLegsByAccount', () => {
    it('группирует по счёту и месяцу в формате SQL DATE_FORMAT (%Y-%m)', () => {
      const legs = [
        { referenceType: 'CashflowTransaction', referenceId: 1, accountId: 300, credit: 100, debit: 0, date: '2026-01-10' },
        { referenceType: 'CashflowTransaction', referenceId: 2, accountId: 300, credit: 200, debit: 0, date: '2026-01-20' },
        { referenceType: 'CashflowTransaction', referenceId: 3, accountId: 300, credit: 400, debit: 0, date: '2026-02-03' },
      ];
      expect(periodsCashLegsByAccount(legs, 'month')).toEqual([
        { accountId: 300, credit: 300, debit: 0, date: '2026-01' },
        { accountId: 300, credit: 400, debit: 0, date: '2026-02' },
      ]);
    });

    it('поддерживает группировку по дню и году', () => {
      const legs = [
        { referenceType: 'Expense', referenceId: 1, accountId: 400, credit: 0, debit: 50, date: '2026-03-15' },
      ];
      expect(periodsCashLegsByAccount(legs, 'day')[0].date).toBe('2026-03-15');
      expect(periodsCashLegsByAccount(legs, 'year')[0].date).toBe('2026');
    });
  });
});
