import { ComponentType, ReactNode } from 'react';
import {
  ReceiptFormProvider,
  useReceiptFormContext,
} from '../ReceiptFormProvider';

/** Клиент из useCustomers (используемые поля). */
export interface ReceiptCustomerLike {
  id: number;
  display_name: string;
  currency_code?: string;
}

/** Товар/услуга из useItems (используемые поля). */
export interface ReceiptItemLike {
  id: number;
  name: string;
  sell_price?: number | null;
  sell_description?: string | null;
}

/** Счёт из useAccounts (используемые поля). */
export interface ReceiptAccountLike {
  id: number;
  name: string;
  account_type?: string;
}

/** Филиал/склад (используемые поля). */
export interface ReceiptBranchLike {
  id: number;
  name: string;
  primary?: boolean;
}

/** Проект/сделка из useProjects (используемые поля). */
export interface ReceiptProjectLike {
  id: number;
  name: string;
}

/**
 * Типизированный срез легаси-контекста ReceiptFormProvider.
 * Сам провайдер объявляет только часть полей без типов,
 * поэтому v2 читает контекст через локальный каст (см. useReceiptFormV2Context).
 */
export interface ReceiptFormV2ContextValue {
  receipt?: Record<string, unknown> & {
    id?: number;
    is_closed?: boolean;
  };
  accounts?: ReceiptAccountLike[];
  customers?: ReceiptCustomerLike[];
  items?: ReceiptItemLike[];
  branches?: ReceiptBranchLike[];
  warehouses?: ReceiptBranchLike[];
  projects?: ReceiptProjectLike[];
  receiptId?: number;
  isNewMode: boolean;
  isBootLoading: boolean;
  isBranchesSuccess?: boolean;
  isWarehousesSuccess?: boolean;
  saleReceiptState?: { defaultTemplateId?: number } | null;
  createReceiptMutate: (form: Record<string, unknown>) => Promise<unknown>;
  editReceiptMutate: (
    args: [number, Record<string, unknown>],
  ) => Promise<unknown>;
}

/** Чтение легаси-контекста с локальной типизацией (без правки провайдера). */
export const useReceiptFormV2Context = (): ReceiptFormV2ContextValue =>
  useReceiptFormContext() as unknown as ReceiptFormV2ContextValue;

/**
 * Легаси-провайдер объявлен без типов пропсов (деструктуризация без типов),
 * кастуем сигнатуру локально — как InvoiceFormProviderLoose в InvoiceForm/v2.
 */
export const ReceiptFormProviderLoose =
  ReceiptFormProvider as unknown as ComponentType<{
    receiptId?: number;
    children?: ReactNode;
  }>;

/** Ответ сервера с массивом типизированных ошибок. */
export interface ServerErrorsResponse {
  response?: { data?: { errors?: Array<{ type: string }> } };
}
