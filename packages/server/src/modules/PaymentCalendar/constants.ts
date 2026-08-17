// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  PLANNED_OPERATION_NOT_FOUND: 'PLANNED_OPERATION_NOT_FOUND',
  INVALID_DIRECTION: 'INVALID_DIRECTION',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  INVALID_RECURRENCE: 'INVALID_RECURRENCE',
  // Материализация плана в реальную операцию (О3 карты v13).
  OPERATION_NOT_MATERIALIZABLE: 'OPERATION_NOT_MATERIALIZABLE',
  PLAN_HAS_NO_ACCOUNT: 'PLAN_HAS_NO_ACCOUNT',
  PLAN_HAS_NO_ARTICLE: 'PLAN_HAS_NO_ARTICLE',
  ARTICLE_HAS_NO_SUITABLE_ACCOUNT: 'ARTICLE_HAS_NO_SUITABLE_ACCOUNT',
  ARTICLE_ACCOUNT_AMBIGUOUS: 'ARTICLE_ACCOUNT_AMBIGUOUS',
};

export const DIRECTIONS = ['inflow', 'outflow'] as const;
export const STATUSES = ['planned', 'confirmed', 'done', 'cancelled'] as const;
export const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

// Статусы, которые попадают в прогноз.
export const FORECAST_STATUSES = ['planned', 'confirmed'] as const;

// Типы денежных счетов для стартового остатка.
export const CASH_ACCOUNT_TYPES = ['cash', 'bank'] as const;
