/**
 * Форма ответа `GET bill-payments/:id` (легаси react-query хук
 * `usePaymentMade` не типизирован — описываем нужные поля локально,
 * только для чтения).
 */
export interface PaymentMadeBill {
  bill_number?: string;
  formatted_bill_date?: string;
  formatted_amount?: string;
  formatted_due_amount?: string;
}

export interface PaymentMadeEntry {
  id?: number;
  bill_id?: number;
  /** Легаси-поле номера счёта на строке (если приходит с сервера). */
  bill_no?: string;
  payment_amount_formatted?: string;
  bill?: PaymentMadeBill;
}

export interface PaymentMadeDetail {
  id?: number;
  payment_number?: string;
  reference?: string;
  statement?: string;
  currency_code?: string;
  exchange_rate?: number | string;

  formatted_amount?: string;
  formatted_subtotal?: string;
  formatted_total?: string;
  formatted_payment_date?: string;
  formatted_created_at?: string;

  vendor_id?: number;
  vendor?: { display_name?: string };
  payment_account?: { name?: string };
  branch?: { name?: string };

  entries?: PaymentMadeEntry[];
}

/**
 * Строка отчёта `GET reports/transactions-by-reference`
 * (проводки по документу; хук `useTransactionsByReference` не типизирован).
 */
export interface GLTransactionAmount {
  amount?: number;
  formatted_amount?: string;
}

export interface GLTransaction {
  date?: { date?: string; formatted_date?: string };
  debit?: GLTransactionAmount;
  credit?: GLTransactionAmount;
  account_id?: number;
  account_name?: string;
  formatted_contact_type?: string;
}
