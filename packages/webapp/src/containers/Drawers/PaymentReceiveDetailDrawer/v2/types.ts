/**
 * Форма ответа `GET payments-received/:id` (легаси react-query хук
 * `usePaymentReceive` не типизирован — описываем нужные поля локально,
 * только для чтения).
 */
export interface PaymentReceivedDetail {
  id?: number;
  payment_receive_no?: string;
  reference_no?: string;
  statement?: string;

  customer_id?: number;
  customer?: { display_name?: string };
  deposit_account?: { name?: string };
  branch?: { name?: string };

  currency_code?: string;
  exchange_rate?: number | string;

  formatted_amount?: string;
  subtotal_formatted?: string;
  formatted_payment_date?: string;
  formatted_created_at?: string;

  entries?: PaymentReceivedEntry[];
}

/** Строка распределения платежа по счёту. */
export interface PaymentReceivedEntry {
  id?: number;
  invoice_id?: number;
  payment_amount_formatted?: string;
  invoice?: {
    invoice_date_formatted?: string;
    invoice_no?: string;
    total_formatted?: string;
    due_amount_formatted?: string;
  };
}

/**
 * Строка проводки из отчёта `transactions-by-reference` (легаси-хук
 * `useTransactionsByReference` не типизирован).
 */
export interface PaymentReceivedGLTransaction {
  id?: number | string;
  date?: { formatted_date?: string };
  account_name?: string;
  contactTypeFormatted?: string;
  debit?: { formatted_amount?: string };
  credit?: { formatted_amount?: string };
}
