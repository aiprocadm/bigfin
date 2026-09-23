// © 2026 Bigfin
import { useMutation, useQuery, useQueryClient } from 'react-query';

import useApiRequest from '../useRequest';

/**
 * Действия с операцией из реестра (FT-022…FT-026 ТЗ-3): метка, сделка,
 * перевод, разбиение, пакетный ввод, история изменений.
 */

const TAGS = 'TRANSACTION_TAGS';
const HISTORY = 'TRANSACTION_HISTORY';

/**
 * Каждое действие меняет строку реестра, а сделка, перевод и разбиение —
 * ещё и отчёты с остатками. Действия редкие: обновляем всё открытое, чтобы
 * ни одна цифра не осталась старой.
 */
const invalidateAll = (client: ReturnType<typeof useQueryClient>) => client.invalidateQueries();

/**
 * Текст отказа сервера. Действия реестра отказывают НАЗВАННОЙ ошибкой с
 * человеческим текстом («перевод возможен только между счетами одной
 * валюты») — его и показываем, а не безликое «ошибка».
 */
export function serverMessage(error: any, fallback: string): string {
  return error?.response?.data?.errors?.[0]?.message || fallback;
}

export interface SplitLineInput {
  amount: number;
  articleId: number;
  projectId?: number | null;
}

export function useTransactionTags() {
  const api = useApiRequest();
  return useQuery<string[]>([TAGS], () => api.get('banking/transaction-tags').then((res) => res.data));
}

export function useSetTransactionTag() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    (input: { referenceType: string; referenceId: number; tag: string | null }) =>
      api.put('banking/transaction-tags', input).then((res) => res.data),
    { onSuccess: () => invalidateAll(client) },
  );
}

export function useLinkTransactionDeal() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    ({ id, dealId }: { id: number; dealId: number | null }) =>
      api.put(`banking/transactions/${id}/deal`, { dealId }).then((res) => res.data),
    { onSuccess: () => invalidateAll(client) },
  );
}

export function useConvertToTransfer() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    ({ id, toAccountId }: { id: number; toAccountId: number }) =>
      api.post(`banking/transactions/${id}/convert-to-transfer`, { toAccountId }).then((res) => res.data),
    { onSuccess: () => invalidateAll(client) },
  );
}

export function useSetTransactionSplits() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    ({ id, lines }: { id: number; lines: SplitLineInput[] }) =>
      api.put(`banking/transactions/${id}/splits`, { lines }).then((res) => res.data),
    { onSuccess: () => invalidateAll(client) },
  );
}

export interface BulkCreateResult {
  created: number;
  failed: number;
  results: Array<{ index: number; id?: number; error?: string; message?: string; fields?: string[] }>;
}

export function useCreateTransactionsBulk() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    (items: Record<string, unknown>[]): Promise<BulkCreateResult> =>
      api.post('banking/transactions/bulk', { items }).then((res) => res.data),
    { onSuccess: () => invalidateAll(client) },
  );
}

export interface TransactionHistoryItem {
  key: string;
  at: string;
  source: 'user' | 'rule';
  action: string;
  actor: string | null;
  details: Record<string, any>;
}

export function useTransactionHistory(
  reference: { referenceType: string; referenceId: number } | null,
) {
  const api = useApiRequest();
  return useQuery<{ items: TransactionHistoryItem[] }>(
    [HISTORY, reference],
    () => api.get('banking/transaction-history', { params: reference }).then((res) => res.data),
    { enabled: !!reference },
  );
}
