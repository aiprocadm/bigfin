// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  ARTICLE_NAME_EXISTS: 'ARTICLE_NAME_EXISTS',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  PARENT_ARTICLE_NOT_FOUND: 'PARENT_ARTICLE_NOT_FOUND',
  ARTICLE_HAS_CHILDREN: 'ARTICLE_HAS_CHILDREN',
  ARTICLE_IN_USE: 'ARTICLE_IN_USE',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  ACCOUNT_ALREADY_MAPPED: 'ACCOUNT_ALREADY_MAPPED',
  ACCOUNT_KIND_MISMATCH: 'ACCOUNT_KIND_MISMATCH',
  ARTICLE_KIND_PARENT_MISMATCH: 'ARTICLE_KIND_PARENT_MISMATCH',
  ARTICLE_KIND_CHILDREN_MISMATCH: 'ARTICLE_KIND_CHILDREN_MISMATCH',
  ARTICLE_PARENT_CYCLE: 'ARTICLE_PARENT_CYCLE',
  INVALID_ARTICLE_KIND: 'INVALID_ARTICLE_KIND',
  COST_BEHAVIOR_ONLY_FOR_EXPENSE: 'COST_BEHAVIOR_ONLY_FOR_EXPENSE',
};

export const ARTICLE_KINDS = ['income', 'expense'] as const;
export const CASHFLOW_SECTIONS = [
  'operating',
  'investing',
  'financing',
] as const;

/**
 * Поведение расхода: постоянный не зависит от объёма продаж (аренда,
 * оклады), переменный растёт вместе с выручкой (закупка товара, сдельная
 * оплата, комиссии). Нужно точке безубыточности (этап 9 ТЗ).
 */
export const COST_BEHAVIORS = ['fixed', 'variable'] as const;
