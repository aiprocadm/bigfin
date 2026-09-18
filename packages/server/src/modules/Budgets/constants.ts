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
// Личные средства собственника сюда входят намеренно (§8.2 ТЗ): оплата
// с личной карты — это настоящая оплата, и не считать её значит занизить
// факт по бюджету движения денег.
export const CASH_ACCOUNT_TYPES = ['cash', 'bank', 'personal-funds'] as const;

// Типы переводов между своими счетами — исключаются из кассового факта.
export const TRANSFER_TYPES = [
  'TransferToAccount',
  'TransferFromAccount',
] as const;
