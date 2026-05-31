export enum Features {
  WAREHOUSES = 'warehouses',
  BRANCHES = 'branches',
  BankSyncing = 'BankSyncing',
  MGMT_ARTICLES = 'mgmt_articles',
  PAYMENT_CALENDAR = 'payment_calendar',
  BUDGETS = 'budgets',
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
