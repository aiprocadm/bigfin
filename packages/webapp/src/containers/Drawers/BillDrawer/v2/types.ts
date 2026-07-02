/**
 * Формы ответов API для drawer'а «Детали счёта поставщика».
 * Легаси react-query хуки (`useBill`, `useTransactionsByReference`,
 * `useBillPaymentTransactions`, `useBillLocatedLandedCost`) не типизированы —
 * описываем нужные поля локально, только для чтения.
 */

/** Строка позиций счёта поставщика (`bill.entries[]`). */
export interface BillEntry {
  id?: number;
  item?: { name?: string };
  description?: string | null;
  quantity_formatted?: string;
  rate_formatted?: string;
  discount_formatted?: string | null;
  total_formatted?: string;
}

/** Налоговая ставка счёта (`bill.taxes[]`). */
export interface BillTaxRate {
  id: number;
  name?: string;
  tax_rate?: number | string;
  tax_rate_amount_formatted?: string;
}

/** Ответ `GET /bills/:id`. */
export interface BillDetail {
  id?: number;
  bill_number?: string | null;
  reference_no?: string | null;
  note?: string | null;

  vendor_id?: number;
  vendor?: { display_name?: string };
  branch?: { name?: string };

  currency_code?: string;
  exchange_rate?: number | string;

  formatted_bill_date?: string;
  formatted_due_date?: string;
  formatted_created_at?: string;

  total_formatted?: string;
  subtotal_formatted?: string;
  formatted_due_amount?: string;
  formatted_payment_amount?: string;
  adjustment_formatted?: string | null;
  discount_amount?: number;
  discount_amount_formatted?: string;
  discount_percentage_formatted?: string | null;

  is_open?: boolean;
  is_fully_paid?: boolean;
  is_overdue?: boolean;

  entries?: BillEntry[];
  taxes?: BillTaxRate[];
}

/** Проводка ГК из `GET /reports/transactions-by-reference`. */
export interface BillGLTransaction {
  date?: { formatted_date?: string };
  account_name?: string;
  contactTypeFormatted?: string;
  debit?: { formatted_amount?: string };
  credit?: { formatted_amount?: string };
}

/** Платёж по счёту из `GET /bills/:id/payment-transactions`. */
export interface BillPaymentTransaction {
  bill_payment_id?: number;
  formatted_payment_date?: string;
  payment_account_name?: string;
  formatted_payment_amount?: string;
  payment_number?: string | null;
  payment_reference_no?: string | null;
}

/** Распределённый накладной расход из `GET landed-cost/bills/:id/transactions`. */
export interface BillLandedCostTransaction {
  id: number;
  name?: string;
  description?: string | null;
  formatted_amount?: string;
  allocation_method_formatted?: string;
  from_transaction_type?: string;
  from_transaction_id?: number;
}
