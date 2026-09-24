// © 2026 Bigfin
import { taxBaseByCashAccount } from './taxBaseByCashAccount';

/**
 * FT-070 ТЗ-3: база налога по денежным счетам — из тех же строк, что и
 * кассовый ОПиУ, разнесённых по счёту, который задел документ.
 */
const BANK = 1;
const CARD = 2;
const REVENUE = 10;
const RENT = 11;
const RECEIVABLE = 12;
const EQUITY = 13;

const types = new Map<number, string>([
  [BANK, 'bank'],
  [CARD, 'bank'],
  [REVENUE, 'income'],
  [RENT, 'expense'],
  [RECEIVABLE, 'accounts-receivable'],
  [EQUITY, 'equity'],
]);
const isCash = (id: number) => id === BANK || id === CARD;

const leg = (
  referenceType: string,
  referenceId: number,
  accountId: number,
  debit: number,
  credit: number,
) => ({ referenceType, referenceId, accountId, debit, credit, date: '2026-05-10' });

describe('база налога по денежным счетам', () => {
  it('доход и расход достаются тому счёту, через который прошли деньги', () => {
    const bases = taxBaseByCashAccount({
      settledLegs: [
        // Выручка на банковский счёт.
        leg('CashflowTransaction', 1, BANK, 1000, 0),
        leg('CashflowTransaction', 1, REVENUE, 0, 1000),
        // Аренда с карты.
        leg('CashflowTransaction', 2, CARD, 0, 300),
        leg('CashflowTransaction', 2, RENT, 300, 0),
        // Взнос собственника на карту — не доход и не расход.
        leg('CashflowTransaction', 3, CARD, 500, 0),
        leg('CashflowTransaction', 3, EQUITY, 0, 500),
      ],
      recognizedLegs: [],
      accountTypeById: types,
      isCashAccount: isCash,
    });

    expect(bases.get(BANK)).toEqual({ income: 1000, expenses: 0 });
    expect(bases.get(CARD)).toEqual({ income: 0, expenses: 300 });
  });

  it('доход, признанный по оплате счёта покупателя, идёт на счёт оплаты', () => {
    const bases = taxBaseByCashAccount({
      settledLegs: [
        leg('PaymentReceive', 7, CARD, 2400, 0),
        leg('PaymentReceive', 7, RECEIVABLE, 0, 2400),
      ],
      // Так их достраивает кассовый ОПиУ: от имени платежа.
      recognizedLegs: [leg('PaymentReceive', 7, REVENUE, 0, 2000)],
      accountTypeById: types,
      isCashAccount: isCash,
    });

    expect(bases.get(CARD)).toEqual({ income: 2000, expenses: 0 });
    expect(bases.has(BANK)).toBe(false);
  });

  it('документ по двум денежным счетам отдаётся счёту с большим оборотом', () => {
    const bases = taxBaseByCashAccount({
      settledLegs: [
        leg('CashflowTransaction', 9, BANK, 100, 0),
        leg('CashflowTransaction', 9, CARD, 900, 0),
        leg('CashflowTransaction', 9, REVENUE, 0, 1000),
      ],
      recognizedLegs: [],
      accountTypeById: types,
      isCashAccount: isCash,
    });

    expect(bases.get(CARD)).toEqual({ income: 1000, expenses: 0 });
    expect(bases.has(BANK)).toBe(false);
  });

  it('возврат выручки уменьшает доход счёта', () => {
    const bases = taxBaseByCashAccount({
      settledLegs: [
        leg('CashflowTransaction', 1, BANK, 1000, 0),
        leg('CashflowTransaction', 1, REVENUE, 0, 1000),
        leg('CashflowTransaction', 2, BANK, 0, 200),
        leg('CashflowTransaction', 2, REVENUE, 200, 0),
      ],
      recognizedLegs: [],
      accountTypeById: types,
      isCashAccount: isCash,
    });

    expect(bases.get(BANK)).toEqual({ income: 800, expenses: 0 });
  });
});
