/** Строка позиции возврата поставщику. */
export interface VendorCreditEntry {
  item?: { name?: string };
  description?: string;
  quantity_formatted?: string;
  rate_formatted?: string;
  discount_formatted?: string;
  total_formatted?: string;
}

/** Детали возврата поставщику (легаси-хук useVendorCredit без типов). */
export interface VendorCreditDetail {
  id: number;
  vendor_credit_number?: string;
  total_formatted?: string;
  formatted_vendor_credit_date?: string;
  formatted_credits_remaining?: string;
  formatted_created_at?: string;
  reference_no?: string;
  exchange_rate?: number;
  currency_code?: string;
  vendor_id?: number;
  vendor?: { display_name?: string };
  is_open: boolean;
  is_closed: boolean;
  is_draft: boolean;
  is_published: boolean;
  entries?: VendorCreditEntry[];
}

/** Строка возврата средств (refund transactions). */
export interface VendorCreditRefundRow {
  id: number;
  formatted_date?: string;
  formtted_amount?: string;
  deposit_account?: { name?: string };
  reference_no?: string;
}

/** Строка сверки со счетами поставщика (reconcile transactions). */
export interface VendorCreditReconcileRow {
  id: number;
  formatted_bill_date?: string;
  bill_reference_no?: string;
  formatted_amount?: string;
}

/** Проводка (GL) по возврату поставщику. */
export interface VendorCreditGLTransaction {
  date?: { formatted_date?: string };
  account_name?: string;
  contactTypeFormatted?: string;
  debit?: { formatted_amount?: string };
  credit?: { formatted_amount?: string };
}
