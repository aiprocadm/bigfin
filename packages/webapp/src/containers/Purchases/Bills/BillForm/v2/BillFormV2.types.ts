import { ComponentType, ReactNode } from 'react';
import { BillFormProvider, useBillFormContext } from '../BillFormProvider';

/** Поставщик из useVendors (используемые поля). */
export interface BillVendorLike {
  id: number;
  display_name: string;
  currency_code?: string;
}

/** Товар/услуга из useItems — закупочная сторона (используемые поля). */
export interface BillItemLike {
  id: number;
  name: string;
  cost_price?: number | null;
  purchase_description?: string | null;
  purchase_tax_rate_id?: number | null;
}

/** Налоговая ставка из useTaxRates (используемые поля). */
export interface BillTaxRateLike {
  id: number;
  name: string;
  rate: number;
}

/** Филиал/склад (используемые поля). */
export interface BillBranchLike {
  id: number;
  name: string;
  primary?: boolean;
}

/**
 * Типизированный срез легаси-контекста BillFormProvider.
 * Сам провайдер — легаси без проверки типов и объявляет только часть полей,
 * поэтому v2 читает контекст через локальный каст (см. useBillFormV2Context).
 */
export interface BillFormV2ContextValue {
  bill?: Record<string, unknown> & {
    id?: number;
    is_open?: boolean;
    payment_amount?: number | string;
  };
  vendors?: BillVendorLike[];
  items?: BillItemLike[];
  taxRates?: BillTaxRateLike[];
  branches?: BillBranchLike[];
  warehouses?: BillBranchLike[];
  isNewMode: boolean;
  isBillLoading?: boolean;
  isItemsLoading?: boolean;
  isVendorsLoading?: boolean;
  isAccountsLoading?: boolean;
  isSettingLoading?: boolean;
  isFeatureLoading?: boolean;
  isBranchesSuccess?: boolean;
  isWarehousesSuccess?: boolean;
  createBillMutate: (form: Record<string, unknown>) => Promise<unknown>;
  editBillMutate: (
    args: [number, Record<string, unknown>],
  ) => Promise<unknown>;
}

/** Чтение легаси-контекста с локальной типизацией (без правки провайдера). */
export const useBillFormV2Context = (): BillFormV2ContextValue =>
  useBillFormContext() as unknown as BillFormV2ContextValue;

/**
 * Легаси-провайдер объявлен без проверки типов (деструктуризация без типов),
 * кастуем сигнатуру локально — как InvoiceFormProviderLoose в InvoiceForm/v2.
 */
export const BillFormProviderLoose =
  BillFormProvider as unknown as ComponentType<{
    billId?: number;
    children?: ReactNode;
  }>;

/** Ответ сервера с массивом типизированных ошибок. */
export interface ServerErrorsResponse {
  response?: { data?: { errors?: Array<{ type: string }> } };
}
