export const DEFAULT_VIEW_COLUMNS = [];

export const VendorDefaultViews = [
  {
    name: 'vendor.view.overdue',
    slug: 'overdue',
    rolesLogicExpression: '1',
    roles: [
      { index: 1, fieldKey: 'status', comparator: 'equals', value: 'overdue' },
    ],
    columns: DEFAULT_VIEW_COLUMNS,
  },
  {
    name: 'vendor.view.unpaid',
    slug: 'unpaid',
    rolesLogicExpression: '1',
    roles: [
      { index: 1, fieldKey: 'status', comparator: 'equals', value: 'unpaid' },
    ],
    columns: DEFAULT_VIEW_COLUMNS,
  },
];

export const ERRORS = {
  VENDOR_HAS_TRANSACTIONS: 'VENDOR_HAS_TRANSACTIONS',
  VENDOR_ALREADY_ACTIVE: 'VENDOR_ALREADY_ACTIVE',
};
