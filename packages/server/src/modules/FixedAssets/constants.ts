// © 2026 Bigfin
import { ACCOUNT_TYPE } from '@/constants/accounts';
export {
  FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE,
  FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE,
} from './utils/fixedAssetGLEntries';

export const ERRORS = {
  FIXED_ASSET_NOT_FOUND: 'FIXED_ASSET_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  ASSET_ACCOUNT_NOT_FOUND: 'ASSET_ACCOUNT_NOT_FOUND',
  ASSET_ACCOUNT_NOT_FIXED: 'ASSET_ACCOUNT_NOT_FIXED',
  PAYMENT_ACCOUNT_NOT_FOUND: 'PAYMENT_ACCOUNT_NOT_FOUND',
  PAYMENT_ACCOUNT_NOT_CASH: 'PAYMENT_ACCOUNT_NOT_CASH',
  ALREADY_DISPOSED: 'ALREADY_DISPOSED',
};

export const CASH_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
];

export const DEPRECIATION_EXPENSE_ACCOUNT = {
  name: 'Амортизация',
  slug: 'depreciation-expense',
  accountType: ACCOUNT_TYPE.EXPENSE,
  code: '40007',
  description: '',
  active: true,
  index: 1,
  predefined: true,
};

export const ACCUMULATED_DEPRECIATION_ACCOUNT = {
  name: 'Накопленная амортизация',
  slug: 'accumulated-depreciation',
  accountType: ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION,
  code: '10199',
  description: '',
  active: true,
  index: 1,
  predefined: true,
};

export const FIXED_ASSET_DISPOSAL_ACCOUNT = {
  name: 'Прибыль/убыток от выбытия ОС',
  slug: 'fixed-asset-disposal',
  accountType: ACCOUNT_TYPE.OTHER_EXPENSE,
  code: '91003',
  description: '',
  active: true,
  index: 1,
  predefined: true,
};

export const DEPRECIATION_ARTICLE = {
  name: 'Амортизация',
  kind: 'expense',
  cashflowSection: 'operating',
  sortOrder: 110,
  active: true,
};
