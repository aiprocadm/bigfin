// © 2026 Bigfin
// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  REPAYMENT_PLAN_NOT_FOUND: 'REPAYMENT_PLAN_NOT_FOUND',
  INSTALLMENT_NOT_FOUND: 'INSTALLMENT_NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  INVALID_SIDE: 'INVALID_SIDE',
  INVALID_PLAN_TOTAL: 'INVALID_PLAN_TOTAL',
  EMPTY_INSTALLMENTS: 'EMPTY_INSTALLMENTS',
};

export const DEBT_SIDES = ['receivable', 'payable'] as const;
export const PLAN_STATUSES = ['active', 'completed', 'cancelled'] as const;
export const INSTALLMENT_STATUSES = ['planned', 'paid'] as const;

// Корзины старения по дням просрочки. toDays=null — «90+».
// Логика принадлежности к корзине совпадает с AgingSummaryReport:
//   beforeDays <= overdueDays && (toDays > overdueDays || toDays === null)
export const AGING_PERIODS = [
  { key: '0-30', beforeDays: 0, toDays: 30 },
  { key: '31-60', beforeDays: 30, toDays: 60 },
  { key: '61-90', beforeDays: 60, toDays: 90 },
  { key: '90+', beforeDays: 90, toDays: null },
] as const;
