import { chain, mapKeys } from 'lodash';
import { Features } from '@/common/types/Features';

/**
 * Типы для настроек-переключателей модулей.
 *
 * Значения настроек лежат в базе строками. Тип из этого справочника —
 * единственное, что превращает строку «0» обратно в «нет»: без него выключенный
 * переключатель возвращается строкой, а непустая строка в JavaScript истинна,
 * и выключенный модуль ведёт себя как включённый.
 *
 * Список строится из самого перечня возможностей, чтобы новый модуль нельзя
 * было добавить в обход справочника.
 */
const getFeaturesSettingsSchema = () =>
  Object.values(Features).reduce(
    (result, feature) => ({ ...result, [feature]: { type: 'boolean' } }),
    {} as Record<string, { type: string }>,
  );

const getTransactionsLockingSettingsSchema = (modules: string[]) => {
  const moduleSchema = {
    active: { type: 'boolean' },
    lock_to_date: { type: 'date' },
    unlock_from_date: { type: 'date' },
    unlock_to_date: { type: 'date' },
    lock_reason: { type: 'string' },
    unlock_reason: { type: 'string' },
  };
  return chain(modules)
    .map((module: string) => {
      return mapKeys(moduleSchema, (value, key: string) => `${module}.${key}`);
    })
    .flattenDeep()
    .reduce((result, value) => {
      return {
        ...result,
        ...value,
      };
    }, {})
    .value();
};

export const SettingsOptions = {
  organization: {
    name: {
      type: 'string',
    },
    base_currency: {
      type: 'string',
    },
    industry: {
      type: 'string',
    },
    location: {
      type: 'string',
    },
    fiscal_year: {
      type: 'string',
    },
    financial_date_start: {
      type: 'string',
    },
    language: {
      type: 'string',
    },
    time_zone: {
      type: 'string',
    },
    date_format: {
      type: 'string',
    },
    accounting_basis: {
      type: 'string',
    },
    // Календарь организации (FT-006b ТЗ-3): 1 — понедельник … 7 — воскресенье.
    week_start_day: {
      type: 'number',
    },
    highlight_weekends: {
      type: 'boolean',
    },
    show_weekdays: {
      type: 'boolean',
    },
  },
  manual_journals: {
    next_number: {
      type: 'string',
    },
    number_prefix: {
      type: 'string',
    },
    auto_increment: {
      type: 'boolean',
    },
  },
  bill_payments: {
    withdrawal_account: {
      type: 'number',
    },
  },
  sales_estimates: {
    next_number: {
      type: 'string',
    },
    number_prefix: {
      type: 'string',
    },
    auto_increment: {
      type: 'boolean',
    },
    customer_notes: {
      type: 'string',
    },
    terms_conditions: {
      type: 'string',
    },
  },
  sales_receipts: {
    next_number: {
      type: 'string',
    },
    number_prefix: {
      type: 'string',
    },
    auto_increment: {
      type: 'boolean',
    },
    preferred_deposit_account: {
      type: 'number',
    },
    receipt_message: {
      type: 'string',
    },
    terms_conditions: {
      type: 'string',
    },
  },
  sales_invoices: {
    next_number: {
      type: 'string',
    },
    number_prefix: {
      type: 'string',
    },
    auto_increment: {
      type: 'boolean',
    },
    customer_notes: {
      type: 'string',
    },
    terms_conditions: {
      type: 'string',
    },
  },
  payment_receives: {
    next_number: {
      type: 'string',
    },
    number_prefix: {
      type: 'string',
    },
    auto_increment: {
      type: 'boolean',
    },
    preferred_deposit_account: {
      type: 'number',
    },
    preferred_advance_deposit: {
      type: 'number',
    },
  },
  items: {
    preferred_sell_account: {
      type: 'number',
    },
    preferred_cost_account: {
      type: 'number',
    },
    preferred_inventory_account: {
      type: 'number',
    },
  },
  expenses: {
    preferred_payment_account: {
      type: 'number',
    },
  },
  inventory: {
    cost_compute_running: {
      type: 'boolean',
    },
  },
  accounts: {
    account_code_required: {
      type: 'boolean',
    },
    account_code_unique: {
      type: 'boolean',
    },
  },
  cashflow: {
    next_number: {
      type: 'string',
    },
    number_prefix: {
      type: 'string',
    },
    auto_increment: {
      type: 'boolean',
    },
  },
  credit_note: {
    next_number: {
      type: 'string',
    },
    number_prefix: {
      type: 'string',
    },
    auto_increment: {
      type: 'boolean',
    },
    customer_notes: {
      type: 'string',
    },
    terms_conditions: {
      type: 'string',
    },
  },
  vendor_credit: {
    next_number: {
      type: 'string',
    },
    number_prefix: {
      type: 'string',
    },
    auto_increment: {
      type: 'boolean',
    },
  },
  warehouse_transfers: {
    next_number: {
      type: 'string',
    },
    number_prefix: {
      type: 'string',
    },
    auto_increment: {
      type: 'boolean',
    },
  },
  'sms-notification': {
    'sms-notification-enable.sale-invoice-details': {
      type: 'boolean',
    },
    'sms-notification-enable.sale-invoice-reminder': {
      type: 'boolean',
    },
    'sms-notification-enable.sale-estimate-details': {
      type: 'boolean',
    },
    'sms-notification-enable.sale-receipt-details': {
      type: 'boolean',
    },
    'sms-notification-enable.payment-receive-details': {
      type: 'boolean',
    },
    'sms-notification-enable.customer-balance': {
      type: 'boolean',
    },
  },
  'transactions-locking': {
    'locking-type': {
      type: 'string',
    },
    ...getTransactionsLockingSettingsSchema([
      'all',
      'sales',
      'purchases',
      'financial',
    ]),
  },
  features: {
    // Исторические имена: в коде таких возможностей уже нет (они называются
    // `warehouses` и `branches`). Оставлены, чтобы не трогать данные старых
    // организаций, где эти строки могли сохраниться.
    'multi-warehouses': {
      type: 'boolean',
    },
    'multi-branches': {
      type: 'boolean',
    },
    ...getFeaturesSettingsSchema(),
  },
};
