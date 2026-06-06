// © 2026 Bigfin
export const ERRORS = {
  DEAL_NOT_FOUND: 'DEAL_NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  DEAL_HAS_OPERATIONS: 'DEAL_HAS_OPERATIONS',
};

export const DEAL_STATUSES = ['in_progress', 'completed', 'cancelled'] as const;
export const DEFAULT_DEAL_STATUS = 'in_progress';
