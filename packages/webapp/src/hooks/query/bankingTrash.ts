// © 2026 Bigfin
import { useMutation, useQuery, useQueryClient } from 'react-query';

import useApiRequest from '../useRequest';

/**
 * Корзина, история импорта и сверка (FT-040…FT-043 ТЗ-3).
 */

export type TrashKind = 'cashflow' | 'bank_line';
export interface TrashItemRef {
  kind: TrashKind;
  id: number;
}

const TRASH = 'BANKING_TRASH';
const IMPORT_BATCHES = 'BANKING_IMPORT_BATCHES';
const RECONCILIATIONS = 'BANKING_RECONCILIATIONS';

/**
 * Корзина, откат и решения сверки меняют остатки, отчёты, реестр и
 * счётчики сразу во многих местах. Действия редкие — обновляем всё, что
 * открыто, чтобы ни одна цифра на экране не осталась старой.
 */
const invalidateMoney = (client: ReturnType<typeof useQueryClient>) => client.invalidateQueries();

export function useTrash(query: { fromDate?: string; toDate?: string; reason?: string }) {
  const api = useApiRequest();
  return useQuery([TRASH, query], () => api.get('banking/trash', { params: query }).then((res) => res.data));
}

export function useMoveToTrash() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation((items: TrashItemRef[]) => api.post('banking/trash', { items }).then((r) => r.data), {
    onSuccess: () => invalidateMoney(client),
  });
}

export function useRestoreFromTrash() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    (items: TrashItemRef[]) => api.post('banking/trash/restore', { items }).then((r) => r.data),
    { onSuccess: () => invalidateMoney(client) },
  );
}

export function usePurgeTrash() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    (items: TrashItemRef[]) => api.post('banking/trash/purge', { items }).then((r) => r.data),
    { onSuccess: () => invalidateMoney(client) },
  );
}

export function useImportBatches(accountId?: number | null) {
  const api = useApiRequest();
  return useQuery([IMPORT_BATCHES, accountId], () =>
    api
      .get('banking/import-batches', { params: accountId ? { accountId } : {} })
      .then((res) => res.data),
  );
}

export function useRollbackImport() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    (batchId: number) => api.post(`banking/import-batches/${batchId}/rollback`).then((r) => r.data),
    { onSuccess: () => invalidateMoney(client) },
  );
}

export function useReconciliations(accountId?: number | null) {
  const api = useApiRequest();
  return useQuery(
    [RECONCILIATIONS, 'list', accountId],
    () =>
      api
        .get('banking/reconciliations', { params: accountId ? { accountId } : {} })
        .then((res) => res.data),
    { enabled: Boolean(accountId) },
  );
}

/** Одна сверка; пока идёт — опрашивается раз в две секунды. */
export function useReconciliation(id?: number | null) {
  const api = useApiRequest();
  return useQuery(
    [RECONCILIATIONS, 'one', id],
    () => api.get(`banking/reconciliations/${id}`).then((res) => res.data),
    {
      enabled: Boolean(id),
      refetchInterval: (data: any) => (data?.status === 'running' ? 2000 : false),
    },
  );
}

export function useStartReconciliationByFile() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    ({ accountId, accountNumber, file }: { accountId: number; accountNumber?: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('accountId', String(accountId));
      if (accountNumber) form.append('accountNumber', accountNumber);
      return api.post('banking/reconciliations/file', form).then((r) => r.data);
    },
    { onSuccess: () => client.invalidateQueries(RECONCILIATIONS) },
  );
}

export function useStartReconciliationByBank() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    (body: { accountId: number; provider: string; accountNumber: string; fromDate: string; toDate: string }) =>
      api.post('banking/reconciliations/integration', body).then((r) => r.data),
    { onSuccess: () => client.invalidateQueries(RECONCILIATIONS) },
  );
}

export function useResolveReconciliation() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    ({ id, itemIds, action }: { id: number; itemIds: number[]; action: 'add' | 'delete' | 'ignore' }) =>
      api.post(`banking/reconciliations/${id}/resolve`, { itemIds, action }).then((r) => r.data),
    { onSuccess: () => invalidateMoney(client) },
  );
}
