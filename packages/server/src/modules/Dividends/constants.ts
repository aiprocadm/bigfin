// © 2026 Bigfin
import { ACCOUNT_TYPE } from '@/constants/accounts';

export const ERRORS = {
  DIVIDEND_PAYOUT_NOT_FOUND: 'DIVIDEND_PAYOUT_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  PAYMENT_ACCOUNT_NOT_FOUND: 'PAYMENT_ACCOUNT_NOT_FOUND',
  PAYMENT_ACCOUNT_NOT_CASH: 'PAYMENT_ACCOUNT_NOT_CASH',
};

/** Тип GL-проводок выплаты собственнику (reference_type в accounts_transactions). */
export const DIVIDEND_PAYOUT_TRANSACTION_TYPE = 'DividendPayout';

/** Доходные P&L-типы счетов (credit-normal) — участвуют в чистой прибыли. */
export const PL_INCOME_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.INCOME,
  ACCOUNT_TYPE.OTHER_INCOME,
];

/** Расходные P&L-типы счетов (debit-normal). */
export const PL_EXPENSE_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.EXPENSE,
  ACCOUNT_TYPE.COST_OF_GOODS_SOLD,
  ACCOUNT_TYPE.OTHER_EXPENSE,
];

/** Все P&L-типы — нетто по ним за всё время = накопленная чистая прибыль. */
export const PL_ACCOUNT_TYPES: string[] = [
  ...PL_INCOME_ACCOUNT_TYPES,
  ...PL_EXPENSE_ACCOUNT_TYPES,
];

/** Денежные счета — допустимые счета списания выплаты. */
export const CASH_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
];

/**
 * Equity-счёт «Выплаты собственнику» — создаётся лениво при первой выплате
 * (find-or-create по slug, паттерн findOrCreateTaxPayable).
 */
export const OWNER_PAYOUTS_ACCOUNT = {
  name: 'Выплаты собственнику',
  slug: 'owner-payouts',
  accountType: ACCOUNT_TYPE.EQUITY,
  code: '30004',
  description: '',
  active: true,
  index: 1,
  predefined: true,
};
