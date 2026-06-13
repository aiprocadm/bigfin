// © 2026 Bigfin
import { ILedgerEntry } from '@/modules/Ledger/types/Ledger.types';
import { AccountNormal } from '@/modules/Accounts/Accounts.types';

export const CREDIT_DISBURSEMENT_TRANSACTION_TYPE = 'CreditDisbursement';
export const CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE =
  'CreditInstallmentPayment';

export interface CreditDisbursementGLInput {
  creditId: number;
  date: string;
  principal: number;
  currencyCode: string;
  bankAccountId: number;
  liabilityAccountId: number;
}

export interface CreditInstallmentPaymentGLInput {
  installmentId: number;
  date: string;
  principalAmount: number;
  interestAmount: number;
  paymentAmount: number;
  currencyCode: string;
  bankAccountId: number;
  liabilityAccountId: number;
  interestExpenseAccountId: number;
}

/** Выдача кредита: Dr банк (деньги пришли) / Cr обязательство (появился долг). */
export const getCreditDisbursementGLEntries = (
  i: CreditDisbursementGLInput,
): ILedgerEntry[] => {
  const common = {
    currencyCode: i.currencyCode,
    exchangeRate: 1,
    transactionType: CREDIT_DISBURSEMENT_TRANSACTION_TYPE,
    transactionId: i.creditId,
    date: i.date,
    debit: 0,
    credit: 0,
  };
  return [
    {
      ...common,
      debit: i.principal,
      accountId: i.bankAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 1,
    },
    {
      ...common,
      credit: i.principal,
      accountId: i.liabilityAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: 2,
    },
  ];
};

/** Платёж по графику: Dr обязательство (тело) + Dr проценты / Cr банк (весь платёж). */
export const getCreditInstallmentPaymentGLEntries = (
  i: CreditInstallmentPaymentGLInput,
): ILedgerEntry[] => {
  const common = {
    currencyCode: i.currencyCode,
    exchangeRate: 1,
    transactionType: CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE,
    transactionId: i.installmentId,
    date: i.date,
    debit: 0,
    credit: 0,
  };
  return [
    {
      ...common,
      debit: i.principalAmount,
      accountId: i.liabilityAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: 1,
    },
    {
      ...common,
      debit: i.interestAmount,
      accountId: i.interestExpenseAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 2,
    },
    {
      ...common,
      credit: i.paymentAmount,
      accountId: i.bankAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 3,
    },
  ];
};
