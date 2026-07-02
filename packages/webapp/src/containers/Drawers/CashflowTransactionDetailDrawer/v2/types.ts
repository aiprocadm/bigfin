/**
 * Форма ответа `GET banking/transactions/:id` (легаси react-query хук
 * `useCashflowTransaction` не типизирован — описываем нужные поля локально,
 * только для чтения).
 */
export interface CashflowTransactionDetail {
  id?: number;
  transaction_number?: string;
  transaction_type?: string;
  transaction_type_formatted?: string;
  reference_no?: string;

  formatted_amount?: string;
  formatted_date?: string;
  currency_code?: string;

  description?: string;
  uncategorized_transaction_id?: number;

  transactions?: CashflowTransactionEntry[];
}

/** Проводка операции (GL-строка): счёт, контакт, кредит/дебет. */
export interface CashflowTransactionEntry {
  id?: number;
  account?: { name?: string };
  contact?: { display_name?: string };
  credit?: number;
  debit?: number;
}
