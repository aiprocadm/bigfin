/**
 * Форма ответа `GET sale-invoices/:id` (легаси react-query хук `useInvoice`
 * не типизирован — описываем нужные поля локально, только для чтения).
 */
export interface InvoiceEntry {
  id?: number;
  item?: { name?: string };
  description?: string;
  quantity?: number | string;
  quantity_formatted?: string;
  rate_formatted?: string;
  discount_formatted?: string;
  total_formatted?: string;
}

export interface InvoiceTaxRate {
  id?: number;
  name?: string;
  tax_rate?: number | string;
  tax_rate_amount_formatted?: string;
}

export interface InvoiceDetail {
  id?: number;
  invoice_no?: string;
  reference_no?: string;

  customer_id?: number;
  customer?: { display_name?: string };
  branch?: { name?: string };

  invoice_date_formatted?: string;
  due_date_formatted?: string;
  created_at_formatted?: string;

  currency_code?: string;
  exchange_rate?: number | string;

  total_formatted?: string;
  subtotal_formatted?: string;
  payment_amount_formatted?: string;
  due_amount_formatted?: string;
  adjustment_formatted?: string;
  discount_amount?: number;
  discount_amount_formatted?: string;
  discount_percentage_formatted?: string;

  is_delivered?: boolean;
  is_fully_paid?: boolean;
  is_overdue?: boolean;
  is_writtenoff?: boolean;

  terms_conditions?: string;
  invoice_message?: string;

  taxes?: InvoiceTaxRate[];
  entries?: InvoiceEntry[];
}

/**
 * Строка отчёта «проводки по документу» (легаси хук
 * `useTransactionsByReference` не типизирован).
 */
export interface InvoiceGLTransaction {
  date?: { formatted_date?: string };
  account_name?: string;
  contactTypeFormatted?: string;
  debit?: { formatted_amount?: string };
  credit?: { formatted_amount?: string };
}

/**
 * Строка платежа по счёту (легаси хук `useInvoicePaymentTransactions`
 * не типизирован).
 */
export interface InvoicePaymentTransaction {
  payment_receive_id?: number;
  formatted_payment_date?: string;
  deposit_account_name?: string;
  formatted_payment_amount?: string;
  payment_number?: string;
  payment_reference_no?: string;
}
