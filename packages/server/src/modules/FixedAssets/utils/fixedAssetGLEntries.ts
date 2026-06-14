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
 * Выбытие ОС. Сумма дебетов = сумме кредитов = cost.
 *
 * Логика (cost-balanced double-entry):
 *   Dr Накопленная амортизация (accumulated)
 *   Dr Банк (убыток/без выгоды: proceeds; прибыль: residual = cost − accumulated)
 *   Dr Убыток от выбытия (если proceeds < residual): residual − proceeds
 *   Cr Актив (убыток/без выгоды: cost; прибыль: cost − gain)
 *   Cr Прибыль от выбытия (если proceeds > residual): proceeds − residual
 *
 * При продаже с прибылью банк дебетуется на остаточную стоимость (residual),
 * а актив кредитуется на cost − gain, чтобы суммарный баланс (= cost) сохранялся.
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
  const isGain = gainLoss > 0;
  const entries: ILedgerEntry[] = [];
  let index = 1;

  // Dr Накопленная амортизация (если есть)
  if (i.accumulated > 0) {
    entries.push({
      ...common,
      debit: i.accumulated,
      accountId: i.accumulatedAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: index++,
    });
  }

  // Dr Банк: при прибыли = residual; при убытке/без прибыли = proceeds
  const bankDebit = isGain ? residual : i.proceeds;
  if (bankDebit > 0 && i.bankAccountId) {
    entries.push({
      ...common,
      debit: bankDebit,
      accountId: i.bankAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: index++,
    });
  }

  // Dr Убыток от выбытия (при убытке)
  if (gainLoss < 0) {
    entries.push({
      ...common,
      debit: round2(-gainLoss),
      accountId: i.disposalAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: index++,
    });
  }

  // Cr Прибыль от выбытия (при прибыли)
  if (gainLoss > 0) {
    entries.push({
      ...common,
      credit: gainLoss,
      accountId: i.disposalAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: index++,
    });
  }

  // Cr Актив: при прибыли = cost − gain; иначе = cost
  const assetCredit = isGain ? round2(i.cost - gainLoss) : i.cost;
  entries.push({
    ...common,
    credit: assetCredit,
    accountId: i.assetAccountId,
    accountNormal: AccountNormal.DEBIT,
    index: index++,
  });

  return entries;
};
