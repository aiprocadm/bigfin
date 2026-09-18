export enum Features {
  WAREHOUSES = 'warehouses',
  BRANCHES = 'branches',
  BankSyncing = 'BankSyncing',
  MGMT_ARTICLES = 'mgmt_articles',
  PAYMENT_CALENDAR = 'payment_calendar',
  BUDGETS = 'budgets',
  CUSTOMERS_LIST_V2 = 'customers_list_v2',
  VENDORS_LIST_V2 = 'vendors_list_v2',
  DEBTS = 'debts',
  PAYMENT_REQUESTS = 'payment_requests',
  DEALS = 'deals',
  COST_ALLOCATION = 'cost_allocation',
  DEAL_STAGES = 'deal_stages',
  PAYROLL = 'payroll',
  PAYROLL_KPI = 'payroll_kpi',
  DATA_QUALITY = 'data_quality',
  DIVIDENDS = 'dividends',
  ACCRUAL_PNL = 'accrual_pnl',
  CREDITS = 'credits',
  FIXED_ASSETS = 'fixed_assets',
  NOTIFICATIONS = 'notifications',
  INTERFACE_MODES = 'interface_modes',
  FINANCIAL_MODEL = 'financial_model',
  BANK_STATEMENT_IMPORT = 'bank_statement_import',
  MOYSKLAD = 'moysklad',
  MARKETPLACES = 'marketplaces',
  BANK_API_SYNC = 'bank_api_sync',
  ONEC_EXPORT = 'onec_export',
  TELEGRAM_QUICK_ENTRY = 'telegram_quick_entry',
  ONEC_IMPORT = 'onec_import',
  ACQUIRING = 'acquiring',
  ZENMONEY_IMPORT = 'zenmoney_import',
  VAT_ANALYSIS = 'vat_analysis',
  RU_PRINT_FORMS = 'ru_print_forms',
  FINANCIAL_RATIOS = 'financial_ratios',
  CRM_INTEGRATION = 'crm_integration',
  /**
   * Первичные документы: счета, акты, накладные, расходы (этап 1 ТЗ, п. 1.4).
   * По умолчанию ВЫКЛЮЧЕН: блок нужен тем, кто выставляет первичку из Bigfin,
   * а не тем, кто ведёт управленческий учёт. Включается в «Настройки → Модули».
   */
  DOCUMENTS = 'documents',
}

export interface IFeatureAllItem {
  name: string;
  isAccessible: boolean;
  defaultAccessible: boolean;
}

export interface IFeatureConfiugration {
  name: string;
  defaultValue?: boolean;
}
