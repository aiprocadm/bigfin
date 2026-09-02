export const RESOURCES_TYPES = {
  INVOICE: 'invoice',
  ESTIMATE: 'estimate',
  RECEIPT: 'receipt',
  PAYMENT_RECEIVE: 'payment_receive',
  PAYMENT_MADE: 'payment_made',
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  ITEM: 'item',
  BILL: 'bill',
  EXPENSE: 'expense',
  MANUAL_JOURNAL: 'manual_journal',
  ACCOUNT: 'account',
  CREDIT_NOTE: 'credit_note',
  VENDOR_CREDIT: 'vendor_credit',

  // Карта v43. Разделы, добавленные позже классических: до сих пор поиск о
  // них не знал вовсе и на их экранах искал «Клиентов».
  DEAL: 'deal',
  PAYMENT_REQUEST: 'payment_request',
  FIXED_ASSET: 'fixed_asset',

  // Карта v48. Последние разделы из задела карт v39 и v43.
  CREDIT: 'credit',
  EMPLOYEE: 'employee',
  BUDGET: 'budget',
  PLANNED_OPERATION: 'planned_operation',
};
