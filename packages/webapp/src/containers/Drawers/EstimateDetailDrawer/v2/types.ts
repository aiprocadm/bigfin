/**
 * Форма ответа `GET sale-estimates/:id` (легаси react-query хук `useEstimate`
 * не типизирован — описываем нужные поля локально, только для чтения).
 */
export interface EstimateEntry {
  id?: number;
  item?: { name?: string };
  description?: string;
  quantity_formatted?: string;
  rate_formatted?: string;
  discount_formatted?: string;
  total_formatted?: string;
}

export interface EstimateDetail {
  id?: number;
  estimate_number?: string;
  reference?: string;

  customer_id?: number;
  customer?: { display_name?: string };
  branch?: { name?: string };

  currency_code?: string;
  exchange_rate?: number | string;

  formatted_estimate_date?: string;
  formatted_expiration_date?: string;
  formatted_created_at?: string;

  total_formatted?: string;
  formatted_subtotal?: string;
  discount_amount_formatted?: string;
  discount_percentage_formatted?: string;
  adjustment_formatted?: string;

  is_approved?: boolean;
  is_rejected?: boolean;
  is_expired?: boolean;
  is_delivered?: boolean;
  is_converted_to_invoice?: boolean;

  note?: string;
  terms_conditions?: string;

  entries?: EstimateEntry[];
}
