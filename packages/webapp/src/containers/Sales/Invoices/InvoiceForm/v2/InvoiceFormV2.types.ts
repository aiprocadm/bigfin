import { ComponentType, ReactNode } from 'react';
import {
  InvoiceFormProvider,
  useInvoiceFormContext,
} from '../InvoiceFormProvider';

/** Клиент из useCustomers (используемые поля). */
export interface InvoiceCustomerLike {
  id: number;
  display_name: string;
  currency_code?: string;
}

/** Товар/услуга из useItems (используемые поля). */
export interface InvoiceItemLike {
  id: number;
  name: string;
  sell_price?: number | null;
  sell_description?: string | null;
  sell_tax_rate_id?: number | null;
}

/** Налоговая ставка из useTaxRates (используемые поля). */
export interface InvoiceTaxRateLike {
  id: number;
  name: string;
  rate: number;
}

/** Филиал/склад (используемые поля). */
export interface InvoiceBranchLike {
  id: number;
  name: string;
  primary?: boolean;
}

/**
 * Типизированный срез легаси-контекста InvoiceFormProvider.
 * Сам провайдер — ts-nocheck и объявляет только часть полей,
 * поэтому v2 читает контекст через локальный каст (см. useInvoiceFormV2Context).
 */
export interface InvoiceFormV2ContextValue {
  invoice?: Record<string, unknown> & {
    id?: number;
    is_delivered?: boolean;
    payment_amount?: number | string;
  };
  items?: InvoiceItemLike[];
  customers?: InvoiceCustomerLike[];
  taxRates?: InvoiceTaxRateLike[];
  branches?: InvoiceBranchLike[];
  warehouses?: InvoiceBranchLike[];
  newInvoice?: Record<string, unknown> | unknown[];
  estimateId?: number | string;
  invoiceId?: number;
  isNewMode: boolean;
  isBootLoading: boolean;
  isBranchesSuccess?: boolean;
  isWarehousesSuccess?: boolean;
  saleInvoiceState?: { defaultTemplateId?: number } | null;
  createInvoiceMutate: (form: Record<string, unknown>) => Promise<unknown>;
  editInvoiceMutate: (
    args: [number, Record<string, unknown>],
  ) => Promise<unknown>;
}

/** Чтение легаси-контекста с локальной типизацией (без правки провайдера). */
export const useInvoiceFormV2Context = (): InvoiceFormV2ContextValue =>
  useInvoiceFormContext() as unknown as InvoiceFormV2ContextValue;

/**
 * Легаси-провайдер объявлен с ts-nocheck (деструктуризация без типов),
 * кастуем сигнатуру локально — как withDialogReduxLoose в ItemCategoryDialog.
 */
export const InvoiceFormProviderLoose =
  InvoiceFormProvider as unknown as ComponentType<{
    invoiceId?: number;
    children?: ReactNode;
  }>;

/** Ответ сервера с массивом типизированных ошибок. */
export interface ServerErrorsResponse {
  response?: { data?: { errors?: Array<{ type: string }> } };
}
