// © 2026 Bigfin
import { ACCOUNT_TYPE } from '@/constants/accounts';

/**
 * Доходные P&L-типы счетов (credit-normal) — участвуют в ОПиУ
 * и обязаны быть привязаны к управленческой статье.
 */
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

/** Все P&L-типы — счета «денег» статьи не требуют и сюда не входят. */
export const PL_ACCOUNT_TYPES: string[] = [
  ...PL_INCOME_ACCOUNT_TYPES,
  ...PL_EXPENSE_ACCOUNT_TYPES,
];

/** Денежные счета — ДДС-сторона сверки ОПиУ↔ДДС. */
export const CASH_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
];

/** Лимит подозрительных групп дублей в ответе (сортировка: сумма убыв.). */
export const MAX_DUPLICATE_GROUPS = 100;

/** Лимит последних операций на счёт в отчёте «операции без статьи». */
export const MAX_OPERATIONS_PER_ACCOUNT = 20;
