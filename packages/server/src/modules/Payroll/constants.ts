// © 2026 Bigfin
export const ERRORS = {
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  EMPLOYEE_HAS_PAYROLL_LINES: 'EMPLOYEE_HAS_PAYROLL_LINES',
  PAYROLL_RUN_NOT_FOUND: 'PAYROLL_RUN_NOT_FOUND',
  PAYROLL_RUN_MONTH_EXISTS: 'PAYROLL_RUN_MONTH_EXISTS',
  PAYROLL_RUN_NOT_DRAFT: 'PAYROLL_RUN_NOT_DRAFT',
  PAYROLL_RUN_NOT_APPROVED: 'PAYROLL_RUN_NOT_APPROVED',
  INVALID_EMPLOYMENT_TYPE: 'INVALID_EMPLOYMENT_TYPE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  DUPLICATE_EMPLOYEE_LINES: 'DUPLICATE_EMPLOYEE_LINES',
  INVALID_FULL_NAME: 'INVALID_FULL_NAME',
  EMPLOYEE_HAS_KPI_TARGETS: 'EMPLOYEE_HAS_KPI_TARGETS',
  KPI_TARGET_NOT_FOUND: 'KPI_TARGET_NOT_FOUND',
  KPI_TARGET_MONTH_EXISTS: 'KPI_TARGET_MONTH_EXISTS',
  INVALID_KPI_METRIC: 'INVALID_KPI_METRIC',
  INVALID_BONUS_RATE: 'INVALID_BONUS_RATE',
};

export const EMPLOYMENT_TYPES = ['staff', 'gph', 'npd', 'ip'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const RUN_STATUSES = ['draft', 'approved'] as const;

export const KPI_METRICS = ['revenue', 'profit'] as const;
export type KpiMetric = (typeof KPI_METRICS)[number];

export const PAYROLL_SOURCE = 'payroll_run';
export const PAYROLL_CURRENCY = 'RUB';

// Дефолты ставок (редактируются в Settings group 'payroll', не хардкод в расчёте).
export const PAYROLL_SETTINGS_DEFAULTS = {
  ndflRate: 13,
  contribMode: 'standard' as 'standard' | 'msp',
  contribRate: 30,
  mspRate: 15,
  mspThreshold: 40639.5, // 1,5 × МРОТ 2026 (27 093 ₽)
  payrollArticleId: null as number | null,
  taxesArticleId: null as number | null,
};
export type PayrollSettingsValues = typeof PAYROLL_SETTINGS_DEFAULTS;
