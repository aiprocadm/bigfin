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
};
