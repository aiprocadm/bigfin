// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  BUDGET_NOT_FOUND: 'BUDGET_NOT_FOUND',
  INVALID_BUDGET_TYPE: 'INVALID_BUDGET_TYPE',
  INVALID_SCENARIO: 'INVALID_SCENARIO',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
};

export const BUDGET_TYPES = ['bdir', 'bdds'] as const;
export const SCENARIOS = ['optimistic', 'realistic', 'pessimistic'] as const;

// Денежные счета для кассового факта.
export const CASH_ACCOUNT_TYPES = ['cash', 'bank'] as const;

// Типы переводов между своими счетами — исключаются из кассового факта.
export const TRANSFER_TYPES = [
  'TransferToAccount',
  'TransferFromAccount',
] as const;
