// © 2026 Bigfin
import { useMutation, useQueryClient } from 'react-query';

import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

/** Одна часть разделённой операции. */
export interface SplitLine {
  amount: number;
  articleId?: number | null;
  projectId?: number | null;
  legalEntityId?: number | null;
}

/**
 * Части, на которые разделена операция (этап 10 ТЗ).
 *
 * Родительская операция при этом НЕ трогается: в отчёты идут части, а в
 * сверку с банком — родитель. Поэтому части живут отдельной выборкой.
 */
export function useTransactionSplits(
  referenceType?: string,
  referenceId?: number,
  props?: any,
) {
  return useRequestQuery(
    [t.TRANSACTION_SPLITS, referenceType, referenceId],
    {
      method: 'get',
      url: `transaction-splits/${referenceType}/${referenceId}`,
    },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: [] as SplitLine[],
      enabled: Boolean(referenceType && referenceId),
      ...props,
    },
  );
}

export function useSaveTransactionSplits(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<
    any,
    any,
    {
      referenceType: string;
      referenceId: number;
      parentAmount: number;
      lines: SplitLine[];
    }
  >(
    ({ referenceType, referenceId, ...body }) =>
      apiRequest.post(
        `transaction-splits/${referenceType}/${referenceId}`,
        body,
      ),
    {
      onSuccess: () => queryClient.invalidateQueries(t.TRANSACTION_SPLITS),
      ...props,
    },
  );
}

/** Убрать разбиение: операция снова идёт в отчёты целиком. */
export function useClearTransactionSplits(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<any, any, { referenceType: string; referenceId: number }>(
    ({ referenceType, referenceId }) =>
      apiRequest.delete(`transaction-splits/${referenceType}/${referenceId}`),
    {
      onSuccess: () => queryClient.invalidateQueries(t.TRANSACTION_SPLITS),
      ...props,
    },
  );
}
