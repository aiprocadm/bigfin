/** Строка категории расхода (позиция). */
export interface ExpenseCategory {
  expense_account?: { name?: string };
  description?: string;
  amount_formatted?: string;
}

/** Детали расхода (легаси-хук useExpense без типов — типизируем локально). */
export interface ExpenseDetail {
  id: number;
  formatted_amount?: string;
  formatted_date?: string;
  reference_no?: string;
  description?: string;
  exchange_rate?: number;
  currency_code?: string;
  formatted_published_at?: string;
  formatted_created_at?: string;
  is_published: boolean;
  branch?: { name?: string };
  categories?: ExpenseCategory[];
}
