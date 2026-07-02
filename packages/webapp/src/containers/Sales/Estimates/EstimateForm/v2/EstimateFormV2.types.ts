import { ComponentType, ReactNode } from 'react';
import {
  EstimateFormProvider,
  useEstimateFormContext,
} from '../EstimateFormProvider';

/** Клиент из useCustomers (используемые поля). */
export interface EstimateCustomerLike {
  id: number;
  display_name: string;
  currency_code?: string;
}

/** Товар/услуга из useItems (используемые поля). */
export interface EstimateItemLike {
  id: number;
  name: string;
  sell_price?: number | null;
  sell_description?: string | null;
}

/** Филиал/склад (используемые поля). */
export interface EstimateBranchLike {
  id: number;
  name: string;
  primary?: boolean;
}

/**
 * Типизированный срез легаси-контекста EstimateFormProvider.
 * Сам провайдер — легаси без строгих типов и объявляет только часть полей,
 * поэтому v2 читает контекст через локальный каст (см. useEstimateFormV2Context).
 */
export interface EstimateFormV2ContextValue {
  estimate?: Record<string, unknown> & {
    id?: number;
    is_delivered?: boolean;
  };
  items?: EstimateItemLike[];
  customers?: EstimateCustomerLike[];
  branches?: EstimateBranchLike[];
  warehouses?: EstimateBranchLike[];
  estimateId?: number;
  isNewMode: boolean;
  isBootLoading: boolean;
  isBranchesSuccess?: boolean;
  isWarehousesSuccess?: boolean;
  saleEstimateState?: { defaultTemplateId?: number } | null;
  createEstimateMutate: (form: Record<string, unknown>) => Promise<unknown>;
  editEstimateMutate: (
    args: [number, Record<string, unknown>],
  ) => Promise<unknown>;
}

/** Чтение легаси-контекста с локальной типизацией (без правки провайдера). */
export const useEstimateFormV2Context = (): EstimateFormV2ContextValue =>
  useEstimateFormContext() as unknown as EstimateFormV2ContextValue;

/**
 * Легаси-провайдер объявлен без типов (деструктуризация без аннотаций),
 * кастуем сигнатуру локально — как InvoiceFormProviderLoose в InvoiceForm/v2.
 */
export const EstimateFormProviderLoose =
  EstimateFormProvider as unknown as ComponentType<{
    estimateId?: number;
    children?: ReactNode;
  }>;

/** Ответ сервера с массивом типизированных ошибок. */
export interface ServerErrorsResponse {
  response?: { data?: { errors?: Array<{ type: string }> } };
}
