/** Строка позиции возврата покупателю. */
export interface CreditNoteEntry {
  item?: { name?: string };
  description?: string;
  quantity_formatted?: string;
  rate_formatted?: string;
  discount_formatted?: string;
  total_formatted?: string;
}

/** Детали возврата покупателю (легаси-хук useCreditNote без типов). */
export interface CreditNoteDetail {
  id: number;
  credit_note_number?: string;
  total_formatted?: string;
  formatted_credit_note_date?: string;
  formatted_credits_remaining?: string;
  formatted_created_at?: string;
  reference_no?: string;
  exchange_rate?: number;
  currency_code?: string;
  customer_id?: number;
  customer?: { display_name?: string };
  is_open: boolean;
  is_closed: boolean;
  is_draft: boolean;
  is_published: boolean;
  entries?: CreditNoteEntry[];
}

/** Строка возврата средств (refund transactions). */
export interface CreditNoteRefundRow {
  id: number;
  formatted_date?: string;
  formtted_amount?: string;
  from_account?: { name?: string };
  reference_no?: string;
}

/** Строка сверки со счетами (reconcile transactions). */
export interface CreditNoteReconcileRow {
  id: number;
  formatted_credit_note_date?: string;
  invoice_number?: string;
  formtted_amount?: string;
}

/** Проводка (GL) по возврату. */
export interface CreditNoteGLTransaction {
  date?: { formatted_date?: string };
  account_name?: string;
  contactTypeFormatted?: string;
  debit?: { formatted_amount?: string };
  credit?: { formatted_amount?: string };
}
