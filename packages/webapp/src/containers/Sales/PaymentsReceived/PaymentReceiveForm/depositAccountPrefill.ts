import { ACCOUNT_TYPE } from '@/constants/accountTypes';

/** Типы счетов, куда можно зачислить оплату (те же, что в фильтре поля). */
const DEPOSITABLE_TYPES: string[] = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
  ACCOUNT_TYPE.OTHER_CURRENT_ASSET,
];

/**
 * Счёт зачисления по умолчанию (Р4 карты v16).
 *
 * Поле обязательно, а префила не было: новичок с единственным расчётным
 * счётом всё равно обязан выбрать его руками. Правила:
 * 1) настройка «предпочитаемый счёт зачисления» важнее всего;
 * 2) если подходящий счёт ровно один — подставляем его;
 * 3) если их несколько — не гадаем, человек выберет сам.
 */
export const resolveDefaultDepositAccount = (
  accounts: { id: number; account_type?: string }[] | undefined,
  preferredDepositAccount: number | null | undefined,
): number | '' => {
  if (preferredDepositAccount) return preferredDepositAccount;

  const depositable = (accounts ?? []).filter((account) =>
    DEPOSITABLE_TYPES.includes(account.account_type ?? ''),
  );

  return depositable.length === 1 ? depositable[0].id : '';
};
