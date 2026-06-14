// © 2026 Bigfin
import { ILedgerEntry } from '@/modules/Ledger/types/Ledger.types';
import { AccountNormal } from '@/modules/Accounts/Accounts.types';

export const FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE =
  'FixedAssetDepreciation';
export const FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE = 'FixedAssetDisposal';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface DepreciationGLInput {
  entryId: number;
  date: string;
  amount: number;
  currencyCode: string;
  expenseAccountId: number;
  accumulatedAccountId: number;
}

/** Начисление амортизации: Dr «Амортизация» (расход) / Cr «Накопленная амортизация». */
export const getDepreciationGLEntries = (
  i: DepreciationGLInput,
): ILedgerEntry[] => {
  const common = {
    currencyCode: i.currencyCode,
    exchangeRate: 1,
    transactionType: FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE,
    transactionId: i.entryId,
    date: i.date,
    debit: 0,
    credit: 0,
  };
  return [
    {
      ...common,
      debit: i.amount,
      accountId: i.expenseAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 1,
    },
    {
      ...common,
      credit: i.amount,
      accountId: i.accumulatedAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: 2,
    },
  ];
};

export interface DisposalGLInput {
  assetId: number;
  date: string;
  currencyCode: string;
  cost: number;
  accumulated: number;
  proceeds: number;
  assetAccountId: number;
  accumulatedAccountId: number;
  disposalAccountId: number;
  bankAccountId: number | null;
}

/**
 * Выбытие ОС. Дебеты всегда равны кредитам; при продаже с прибылью итог =
 * accumulated + proceeds, при убытке/ликвидации = cost.
 *
 * Логика (правильная двойная запись):
 *   Dr Накопленная амортизация (accumulated)        — если accumulated > 0
 *   Dr Банк (полная сумма поступления: proceeds)    — если proceeds > 0
 *   Dr Убыток от выбытия (если proceeds < residual)
 *   Cr Прибыль от выбытия (если proceeds > residual)
 *   Cr Актив по ПОЛНОЙ первоначальной стоимости (cost)
 */
export const getDisposalGLEntries = (i: DisposalGLInput): ILedgerEntry[] => {
  const common = {
    currencyCode: i.currencyCode,
    exchangeRate: 1,
    transactionType: FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE,
    transactionId: i.assetId,
    date: i.date,
    debit: 0,
    credit: 0,
  };

  const residual = round2(i.cost - i.accumulated);
  const gainLoss = round2(i.proceeds - residual); // >0 прибыль, <0 убыток
  const entries: ILedgerEntry[] = [];
  let index = 1;

  // Закрываем накопленную амортизацию (Dr контр-актив).
  if (i.accumulated > 0) {
    entries.push({
      ...common,
      debit: i.accumulated,
      accountId: i.accumulatedAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: index++,
    });
  }

  // Деньги от продажи — полная сумма поступления (Dr банк).
  if (i.proceeds > 0 && i.bankAccountId) {
    entries.push({
      ...common,
      debit: i.proceeds,
      accountId: i.bankAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: index++,
    });
  }

  // Прибыль/убыток от выбытия.
  if (gainLoss < 0) {
    entries.push({
      ...common,
      debit: round2(-gainLoss),
      accountId: i.disposalAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: index++,
    });
  } else if (gainLoss > 0) {
    entries.push({
      ...common,
      credit: gainLoss,
      accountId: i.disposalAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: index++,
    });
  }

  // Убираем актив по полной первоначальной стоимости (Cr актив).
  entries.push({
    ...common,
    credit: i.cost,
    accountId: i.assetAccountId,
    accountNormal: AccountNormal.DEBIT,
    index: index++,
  });

  return entries;
};
