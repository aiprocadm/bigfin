// © 2026 Bigfin
// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  PAYMENT_REQUEST_NOT_FOUND: 'PAYMENT_REQUEST_NOT_FOUND',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
};

export const REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const;

export const PAYMENT_REQUEST_SOURCE = 'payment_request';
