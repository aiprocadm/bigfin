// © 2026 Bigfin
import { ILedgerEntry } from '@/modules/Ledger/types/Ledger.types';
import { AccountNormal } from '@/modules/Accounts/Accounts.types';
import { DIVIDEND_PAYOUT_TRANSACTION_TYPE } from '../constants';

export interface DividendPayoutGLInput {
  id: number;
  date: string;
  amount: number;
  currencyCode: string;
  equityAccountId: number;
  paymentAccountId: number;
  note?: string | null;
}

/**
 * GL-проводки выплаты собственнику (паттерн ExpenseGL):
 * дебет equity «Выплаты собственнику» (уменьшает капитал),
 * кредит денежного счёта (отток денег). ОПиУ не затрагивается —
 * выплата собственнику не расход.
 */
export const getDividendPayoutGLEntries = (
  payout: DividendPayoutGLInput,
): ILedgerEntry[] => {
  const commonEntry = {
    currencyCode: payout.currencyCode,
    exchangeRate: 1,
    transactionType: DIVIDEND_PAYOUT_TRANSACTION_TYPE,
    transactionId: payout.id,
    date: payout.date,
    note: payout.note ?? undefined,
    debit: 0,
    credit: 0,
  };

  return [
    {
      ...commonEntry,
      debit: payout.amount,
      accountId: payout.equityAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: 1,
    },
    {
      ...commonEntry,
      credit: payout.amount,
      accountId: payout.paymentAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 2,
    },
  ];
};
