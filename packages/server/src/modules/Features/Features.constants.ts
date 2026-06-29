// © 2026 Bigfin
import { Features } from '@/common/types/Features';

/**
 * Пользовательские продуктовые модули, переключаемые на странице Настройки → Модули.
 * Технические/под-флаги (customers_list_v2, vendors_list_v2, interface_modes, accrual_pnl,
 * payroll_kpi, deal_stages, bank_statement_import, BankSyncing) намеренно НЕ включены —
 * их переключение пользователем может сломать экран.
 */
export const MODULE_ALLOWLIST: string[] = [
  // Планирование
  Features.PAYMENT_CALENDAR, Features.BUDGETS, Features.FINANCIAL_MODEL,
  // Учёт и аналитика
  Features.MGMT_ARTICLES, Features.DEALS, Features.COST_ALLOCATION, Features.DEBTS,
  Features.PAYMENT_REQUESTS, Features.DIVIDENDS, Features.CREDITS, Features.FIXED_ASSETS,
  Features.PAYROLL, Features.VAT_ANALYSIS, Features.FINANCIAL_RATIOS, Features.DATA_QUALITY,
  // Интеграции
  Features.BANK_API_SYNC, Features.ACQUIRING, Features.ZENMONEY_IMPORT, Features.ONEC_EXPORT,
  Features.MOYSKLAD, Features.MARKETPLACES, Features.CRM_INTEGRATION,
  // Структура
  Features.BRANCHES, Features.WAREHOUSES,
  // Прочее
  Features.NOTIFICATIONS,
];
