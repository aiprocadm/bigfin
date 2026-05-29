export enum Features {
  WAREHOUSES = 'warehouses',
  BRANCHES = 'branches',
  BankSyncing = 'BankSyncing',
  MGMT_ARTICLES = 'mgmt_articles',
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
