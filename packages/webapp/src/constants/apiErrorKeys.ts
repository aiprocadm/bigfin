/**
 * Единый словарь «код деловой ошибки сервера → ключ перевода» (С1 карты v14).
 *
 * Сервер почти всегда шлёт ошибку без текста — смысл несёт только код `type`.
 * Всё, что фронт умеет объяснить пользователю, собирается здесь, а не по
 * разрозненным utils-мапперам; новый код = одна строка. Локальные особенности
 * экрана передаются вторым аргументом `showApiError`.
 */
export const API_ERROR_KEYS: Record<string, string> = {
  // Контрагенты
  'CUSTOMER.HAS.SALES_INVOICES': 'customer_has_sales_invoices',
  'SOME.CUSTOMERS.HAVE.SALES_INVOICES': 'some_customers_have_sales_invoices',
  CUSTOMER_HAS_TRANSACTIONS:
    'this_customer_cannot_be_deleted_as_it_is_associated_with_transactions',
  'VENDOR.HAS.BILLS': 'vendor_has_bills',
  // Счета учёта
  account_predefined: 'cannot_delete_predefined_accounts',
  account_has_associated_transactions:
    'cannot_delete_account_has_associated_transactions',
  // Справочники (заведены в v12)
  ARTICLE_IN_USE: 'management_articles.error_in_use',
  ARTICLE_HAS_CHILDREN: 'management_articles.error_has_children',
  TAX_RATE_IN_USE: 'tax_rates.alert.in_use',
  // Пользователи и валюты
  CANNOT_DELETE_LAST_USER: 'cannot_delete_the_last_user_in_the_system',
  'CANNOT.TOGGLE.ACTIVATE.AUTHORIZED.USER':
    'cannot_toggle_activate_authorized_user',
  CANNOT_DELETE_BASE_CURRENCY: 'cannot_delete_the_base_currency',
  // Документы
  INVOICE_HAS_ASSOCIATED_PAYMENT_ENTRIES: 'the_invoice_cannot_be_deleted',
  INVOICE_AMOUNT_SMALLER_THAN_PAYMENT_AMOUNT: 'the_payment_amount_that_received',
  SALE_INVOICE_HAS_APPLIED_TO_CREDIT_NOTES:
    'invoices.error.you_couldn_t_delete_sale_invoice_that_has_reconciled',
  BILL_HAS_ASSOCIATED_PAYMENT_ENTRIES:
    'cannot_delete_bill_that_has_payment_transactions',
  BILL_HAS_ASSOCIATED_LANDED_COSTS:
    'cannot_delete_bill_that_has_associated_landed_cost_transactions',
  BILL_HAS_APPLIED_TO_VENDOR_CREDIT:
    'bills.error.you_couldn_t_delete_bill_has_reconciled_with_vendor_credit',
  SALE_ESTIMATE_CONVERTED_TO_INVOICE:
    'estimate.delete.error.estimate_converted_to_invoice',
  CANNOT_DELETE_TRANSACTION_CONVERTED_FROM_UNCATEGORIZED:
    'cashflow.error.cannot_delete_transaction_converted_from_uncategorized',
  CANNOT_DELETE_TRANSACTION_MATCHED:
    'invoices.error.cannot_delete_transaction_matched_with_bank',
  // Общие коды ядра: страж deleteIfNoRelations и фильтр внешних ключей
  MODEL_HAS_RELATIONS: 'error.has_relations',
  FOREIGN_KEY_VIOLATION: 'error.broken_reference',
};
