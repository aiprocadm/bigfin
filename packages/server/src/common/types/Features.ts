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
