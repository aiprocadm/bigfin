// © 2026 Bigfin
import { ACCOUNT_TYPE } from '@/constants/accounts';
export {
  CREDIT_DISBURSEMENT_TRANSACTION_TYPE,
  CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE,
} from './utils/creditGLEntries';

export const ERRORS = {
  CREDIT_NOT_FOUND: 'CREDIT_NOT_FOUND',
  INSTALLMENT_NOT_FOUND: 'INSTALLMENT_NOT_FOUND',
  INSTALLMENT_ALREADY_PAID: 'INSTALLMENT_ALREADY_PAID',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  PAYMENT_ACCOUNT_NOT_FOUND: 'PAYMENT_ACCOUNT_NOT_FOUND',
  PAYMENT_ACCOUNT_NOT_CASH: 'PAYMENT_ACCOUNT_NOT_CASH',
  CANNOT_EDIT_WITH_PAID_INSTALLMENTS: 'CANNOT_EDIT_WITH_PAID_INSTALLMENTS',
};

/** Денежные счета — допустимый счёт выдачи/платежа. */
export const CASH_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
];

/** Счёт «Проценты по кредитам» — find-or-create по slug (паттерн OWNER_PAYOUTS_ACCOUNT). */
export const LOAN_INTEREST_EXPENSE_ACCOUNT = {
  name: 'Проценты по кредитам',
  slug: 'loan-interest-expense',
  accountType: ACCOUNT_TYPE.EXPENSE,
  code: '60110',
  description: '',
  active: true,
  index: 1,
  predefined: true,
};

/** Статья ④ «Проценты по кредитам» (find-or-create по name+kind). */
export const LOAN_INTEREST_ARTICLE = {
  name: 'Проценты по кредитам',
  kind: 'expense',
  cashflowSection: 'financing',
  sortOrder: 100,
  active: true,
};

/** Тип счёта-обязательства по сроку кредита. */
export const liabilityAccountTypeForTerm = (termMonths: number): string =>
  termMonths <= 12
    ? ACCOUNT_TYPE.OTHER_CURRENT_LIABILITY
    : ACCOUNT_TYPE.LOGN_TERM_LIABILITY; // upstream-typo LOGN — не переименовываем
