/**
 * Форма ответа `GET vendors/:id` (легаси react-query хук `useVendor`
 * не типизирован — описываем нужные поля локально, только для чтения).
 */
export interface VendorDetail {
  id?: number;
  display_name?: string;
  company_name?: string;
  email?: string;
  personal_phone?: string;
  work_phone?: string;
  website?: string;
  note?: string;
  active?: boolean;

  currency_code?: string;
  formatted_balance?: string;
  formatted_opening_balance?: string;
  formatted_opening_balance_at?: string;

  billing_address1?: string;
  billing_address2?: string;
  billing_address_city?: string;
  billing_address_state?: string;
  billing_address_postcode?: string;
  billing_address_country?: string;
  billing_address_phone?: string;

  shipping_address1?: string;
  shipping_address2?: string;
  shipping_address_city?: string;
  shipping_address_state?: string;
  shipping_address_postcode?: string;
  shipping_address_country?: string;
  shipping_address_phone?: string;
}

/** Адресный блок в едином виде (для карточки «Адреса»). */
export interface VendorAddress {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
}
