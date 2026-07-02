/**
 * Форма ответа `GET sale-receipts/:id` (легаси react-query хук `useReceipt`
 * не типизирован — описываем нужные поля локально, только для чтения).
 */
export interface ReceiptEntry {
  id?: number;
  item?: { name?: string };
  description?: string;
  quantity_formatted?: string;
  rate?: number | string;
  rate_formatted?: string;
  amount?: number | string;
  discount_formatted?: string;
  total_formatted?: string;
}

export interface ReceiptDetail {
  id?: number;
  receipt_number?: string;
  reference_no?: string;

  customer_id?: number;
  customer?: { display_name?: string };
  deposit_account?: { name?: string };
  branch?: { name?: string };

  is_closed?: boolean;
  currency_code?: string;
  exchange_rate?: number | string;

  formatted_receipt_date?: string;
  formatted_closed_at_date?: string;
  formatted_created_at?: string;

  total_formatted?: string;
  subtotal_formatted?: string;
  discount_amount?: number;
  discount_amount_formatted?: string;
  discount_percentage_formatted?: string;
  adjustment_formatted?: string;
  paid_formatted?: string;

  statement?: string;
  receipt_message?: string;

  entries?: ReceiptEntry[];
}

/**
 * Строка проводки из `GET reports/transactions-by-reference`
 * (легаси хук `useTransactionsByReference` тоже без типов).
 */
export interface ReceiptGLTransaction {
  id?: number;
  index?: number;
  date?: { formatted_date?: string };
  account_name?: string;
  contactTypeFormatted?: string;
  debit?: { formatted_amount?: string };
  credit?: { formatted_amount?: string };
}
