import intl from 'react-intl-universal';

// Список строится при вызове: словарь к моменту импорта модуля ещё не загружен.
export const getExportResources = () => [
  { value: 'account', text: intl.get('accounts') },
  { value: 'item', text: intl.get('items') },
  { value: 'item_category', text: intl.get('export.resource.item_categories') },
  { value: 'customer', text: intl.get('customers') },
  { value: 'vendor', text: intl.get('vendors') },
  { value: 'manual_journal', text: intl.get('manual_journals') },
  { value: 'expense', text: intl.get('expenses') },
  { value: 'sale_invoice', text: intl.get('invoices') },
  { value: 'sale_estimate', text: intl.get('estimates') },
  { value: 'sale_receipt', text: intl.get('receipts') },
  {
    value: 'payment_receive',
    text: intl.get('export.resource.payments_received'),
  },
  { value: 'credit_note', text: intl.get('export.resource.credit_notes') },
  { value: 'bill', text: intl.get('bills') },
  { value: 'bill_payment', text: intl.get('payments_made') },
  { value: 'vendor_credit', text: intl.get('export.resource.vendor_credits') },
  { value: 'tax_rate', text: intl.get('tax_rates') },
  {
    value: 'bank_transaction',
    text: intl.get('export.resource.bank_transactions'),
  },
];
