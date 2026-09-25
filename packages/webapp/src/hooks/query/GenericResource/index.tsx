import { useRequestQuery } from '../../useQueryRequest';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';

/**
 *
 * @param {string} type
 * @param {string} searchKeyword
 * @param {*} query
 * @returns
 */
export function useResourceData(type: string, query?: any, props?: any) {
  const url = getResourceUrlFromType(type);

  return useRequestQuery(
    ['UNIVERSAL_SEARCH', type, query],
    { method: 'get', url, params: query },
    {
      select: transformResourceData(type),
      defaultData: {
        items: [],
      },
      ...props,
    },
  );
}

/**
 * Retrieve the resource url by the given resource type.
 * @param {string} type
 * @returns {string}
 */
export function getResourceUrlFromType(type: string): string {
  const config = {
    [RESOURCES_TYPES.INVOICE]: '/sale-invoices',
    [RESOURCES_TYPES.ESTIMATE]: '/sale-estimates',
    [RESOURCES_TYPES.ITEM]: '/items',
    [RESOURCES_TYPES.RECEIPT]: '/sale-receipts',
    [RESOURCES_TYPES.BILL]: '/bills',
    [RESOURCES_TYPES.PAYMENT_RECEIVE]: '/payments-received',
    [RESOURCES_TYPES.PAYMENT_MADE]: '/bill-payments',
    [RESOURCES_TYPES.CUSTOMER]: '/customers',
    [RESOURCES_TYPES.VENDOR]: '/vendors',
    [RESOURCES_TYPES.MANUAL_JOURNAL]: '/manual-journals',
    [RESOURCES_TYPES.ACCOUNT]: '/accounts',
    [RESOURCES_TYPES.CREDIT_NOTE]: '/credit-notes',
    [RESOURCES_TYPES.VENDOR_CREDIT]: '/vendor-credits',
    [RESOURCES_TYPES.EXPENSE]: '/expenses',
    [RESOURCES_TYPES.DEAL]: '/deals',
    [RESOURCES_TYPES.PAYMENT_REQUEST]: '/payment-requests',
    [RESOURCES_TYPES.FIXED_ASSET]: '/fixed-assets',
    [RESOURCES_TYPES.CREDIT]: '/credits',
    [RESOURCES_TYPES.EMPLOYEE]: '/payroll/employees',
    [RESOURCES_TYPES.BUDGET]: '/budgets',
    [RESOURCES_TYPES.PLANNED_OPERATION]: '/payment-calendar/planned-operations',
  };
  return config[type] || '';
}

/**
 * Transformes invoices to resource data.
 */
const transformInvoices = (response: any) => ({
  items: response.data.sales_invoices,
});

/**
 * Transformes items to resource data.
 */
const transformItems = (response: any) => ({
  items: response.data.items,
});

/**
 * Transformes payment receives to resource data.
 */
const transformPaymentReceives = (response: any) => ({
  items: response.data.payment_receives,
});

/**
 * Transformes customers to resoruce data.
 */
const transformCustomers = (response: any) => ({
  items: response.data.customers,
});

/**
 * Transformes customers to resoruce data.
 */
const transformVendors = (response: any) => ({
  items: response.data.vendors,
});

const transformPaymentMades = (response: any) => ({
  items: response.data.bill_payments,
});

const transformSaleReceipts = (response: any) => ({
  items: response.data.data,
});

const transformBills = (response: any) => ({
  items: response.data.bills,
});

const transformManualJournals = (response: any) => ({
  items: response.data.manual_journals,
});

const transformsEstimates = (response: any) => ({
  items: response.data.sales_estimates,
});

const transformAccounts = (response: any) => ({
  items: response.data.accounts,
});

const transformCreditNotes = (response: any) => ({
  items: response.data.credit_notes,
});

const transformVendorCredits = (response: any) => ({
  items: response.data.vendor_credits,
});

/**
 * Transformes expenses to resource data.
 */
const transformExpenses = (response: any) => ({
  items: response.data.expenses,
});

/**
 * Разделы карты v43 отдают список массивом — иногда завёрнутым в `data`.
 * Общий разбор: одна форма ответа на три раздела.
 */
const transformPlainList = (response: any) => ({
  items: response.data?.data ?? response.data ?? [],
});

/**
 * Detarmines the transformer based on the given resource type.
 * @param {string} type - Resource type.
 */
export const transformResourceData = (type: string) => (response: any) => {
  const pairs = {
    [RESOURCES_TYPES.ESTIMATE]: transformsEstimates,
    [RESOURCES_TYPES.INVOICE]: transformInvoices,
    [RESOURCES_TYPES.RECEIPT]: transformSaleReceipts,
    [RESOURCES_TYPES.ITEM]: transformItems,
    [RESOURCES_TYPES.PAYMENT_RECEIVE]: transformPaymentReceives,
    [RESOURCES_TYPES.PAYMENT_MADE]: transformPaymentMades,
    [RESOURCES_TYPES.CUSTOMER]: transformCustomers,
    [RESOURCES_TYPES.VENDOR]: transformVendors,
    [RESOURCES_TYPES.BILL]: transformBills,
    [RESOURCES_TYPES.MANUAL_JOURNAL]: transformManualJournals,
    [RESOURCES_TYPES.ACCOUNT]: transformAccounts,
    [RESOURCES_TYPES.CREDIT_NOTE]: transformCreditNotes,
    [RESOURCES_TYPES.VENDOR_CREDIT]: transformVendorCredits,
    [RESOURCES_TYPES.EXPENSE]: transformExpenses,
    [RESOURCES_TYPES.DEAL]: transformPlainList,
    [RESOURCES_TYPES.PAYMENT_REQUEST]: transformPlainList,
    [RESOURCES_TYPES.FIXED_ASSET]: transformPlainList,
    [RESOURCES_TYPES.CREDIT]: transformPlainList,
    [RESOURCES_TYPES.EMPLOYEE]: transformPlainList,
    [RESOURCES_TYPES.BUDGET]: transformPlainList,
    [RESOURCES_TYPES.PLANNED_OPERATION]: transformPlainList,
  };
  return {
    ...pairs[type](response),
    _type: type,
  };
};
