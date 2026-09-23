// © 2026 Bigfin
// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  RULE_NOT_FOUND: 'RULE_NOT_FOUND',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  ARTICLE_NOT_EXPENSE: 'ARTICLE_NOT_EXPENSE',
  INVALID_ALLOCATION_KEY: 'INVALID_ALLOCATION_KEY',
  INVALID_MANUAL_SHARES: 'INVALID_MANUAL_SHARES',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
};

// Пять баз (FT-011 ТЗ-3): выручка, ФОТ, ВП1, поровну, вручную.
export const ALLOCATION_KEYS = [
  'revenue',
  'production_payroll',
  'gross_profit_1',
  'equal',
  'manual_share',
] as const;

/** Между кем делится пул: сделки или направления (FT-011 ТЗ-3). */
export const ALLOCATION_TARGET_TYPES = ['deal', 'direction'] as const;
