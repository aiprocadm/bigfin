// © 2026 Bigfin
import { ACCOUNT_TYPE } from '@/constants/accounts';

/** Названные отказы действий реестра (FT-022 ТЗ-3). */
export const TRANSACTION_ACTION_ERRORS = {
  NOT_FOUND: 'TRANSACTION_ACTION_NOT_FOUND',
  DEAL_NOT_FOUND: 'TRANSACTION_ACTION_DEAL_NOT_FOUND',
  ALREADY_TRANSFER: 'TRANSACTION_ALREADY_TRANSFER',
  TRANSFER_NOT_SUPPORTED: 'TRANSACTION_TRANSFER_NOT_SUPPORTED',
  TRANSFER_TARGET_INVALID: 'TRANSACTION_TRANSFER_TARGET_INVALID',
  TRANSFER_SAME_ACCOUNT: 'TRANSACTION_TRANSFER_SAME_ACCOUNT',
  TRANSFER_CURRENCY_MISMATCH: 'TRANSACTION_TRANSFER_CURRENCY_MISMATCH',
  TRANSFER_HAS_SPLITS: 'TRANSACTION_TRANSFER_HAS_SPLITS',
  SPLIT_WITHOUT_ARTICLE: 'TRANSACTION_SPLIT_WITHOUT_ARTICLE',
  SPLIT_ARTICLE_WITHOUT_ACCOUNT: 'TRANSACTION_SPLIT_ARTICLE_WITHOUT_ACCOUNT',
} as const;

/** Счета, между которыми возможен перевод: деньги, а не статьи. */
export const TRANSFER_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
  ACCOUNT_TYPE.CREDIT_CARD,
];

const INCOMING = ['OtherIncome', 'OwnerContribution'];
const OUTGOING = ['OtherExpense', 'OwnerDrawing'];
const TRANSFERS = ['TransferFromAccount', 'TransferToAccount'];

/** Вид операции в одном написании: в базе встречаются оба. */
export function pascalType(type: string | null | undefined): string {
  const value = String(type ?? '');
  if (!value.includes('_')) return value;
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export type TransferPlan =
  | { transactionType: 'TransferFromAccount' | 'TransferToAccount' }
  | { error: string; message: string };

/**
 * Можно ли превратить операцию в перевод на счёт `target` — и каким видом.
 * Поступление становится «переводом со счёта», выплата — «переводом на
 * счёт». Каждый отказ объясняет себя словами (AC FT-022).
 */
export function transferPlan(operation: any, target: any, hasSplits: boolean): TransferPlan {
  const type = pascalType(operation?.transactionType);
  if (TRANSFERS.includes(type)) {
    return { error: TRANSACTION_ACTION_ERRORS.ALREADY_TRANSFER, message: 'Операция уже перевод' };
  }
  const incoming = INCOMING.includes(type);
  if (!incoming && !OUTGOING.includes(type)) {
    return {
      error: TRANSACTION_ACTION_ERRORS.TRANSFER_NOT_SUPPORTED,
      message: 'Перевести в перевод можно только поступление или выплату',
    };
  }
  if (hasSplits) {
    return {
      error: TRANSACTION_ACTION_ERRORS.TRANSFER_HAS_SPLITS,
      message: 'У операции есть части — сначала уберите разбиение',
    };
  }
  if (!target || !TRANSFER_ACCOUNT_TYPES.includes(target.accountType)) {
    return {
      error: TRANSACTION_ACTION_ERRORS.TRANSFER_TARGET_INVALID,
      message: 'Перевод возможен только на кассу, банковский счёт или карту',
    };
  }
  if (Number(target.id) === Number(operation.cashflowAccountId)) {
    return {
      error: TRANSACTION_ACTION_ERRORS.TRANSFER_SAME_ACCOUNT,
      message: 'Нельзя перевести деньги на тот же счёт',
    };
  }
  const from = operation.cashflowAccount?.currencyCode;
  if (from && target.currencyCode && from !== target.currencyCode) {
    return {
      error: TRANSACTION_ACTION_ERRORS.TRANSFER_CURRENCY_MISMATCH,
      message: 'Перевод возможен только между счетами одной валюты',
    };
  }
  return { transactionType: incoming ? 'TransferFromAccount' : 'TransferToAccount' };
}
