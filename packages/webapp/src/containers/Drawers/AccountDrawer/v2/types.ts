/**
 * Форма ответа `GET accounts/:id` (легаси react-query хук `useAccount`
 * не типизирован — описываем нужные поля локально, только для чтения).
 */
export interface AccountDetail {
  id?: number;
  name?: string;
  code?: string;
  description?: string;
  active?: boolean;

  account_type?: string;
  account_type_label?: string;
  /** Нормальная сторона счёта: 'debit' | 'credit'. */
  account_normal?: string;
  account_normal_formatted?: string;

  currency_code?: string;
  formatted_amount?: string;
}

/**
 * Строка ответа `GET accounts/transactions?account_id=` (легаси хук
 * `useAccountTransactions` не типизирован — только читаемые поля).
 */
export interface AccountTransaction {
  transaction_id?: number;
  transaction_type?: string;
  formatted_date?: string;
  transaction_type_formatted?: string;
  formatted_debit?: string;
  formatted_credit?: string;
  formatted_fc_debit?: string;
  formatted_fc_credit?: string;
}
