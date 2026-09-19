// © 2026 Bigfin
import { useMutation, useQueryClient } from 'react-query';

import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

export interface MetricValue {
  value: number;
  applicable: boolean;
}

export interface ValueDriver {
  key: string;
  amount: number;
  direction: 'up' | 'down';
}

export interface Capitalization {
  fromDate: string;
  toDate: string;

  assets: number;
  liabilities: number;
  netAssets: number;
  /** Отчёт «Баланс» вообще построился. */
  hasBalance: boolean;

  profit: number;
  /** Множитель прибыли из настроек; `null` — не задан. */
  profitMultiple: number | null;
  multipleValuation: MetricValue;

  ownershipSharePercent: number | null;
  ownerValue: MetricValue;

  drivers: ValueDriver[];
}

/**
 * «Сколько стоит мой бизнес» (этап 11 ТЗ).
 *
 * Значения по умолчанию намеренно НЕ выглядят как расчёт: `hasBalance`
 * ложно, оценки неприменимы. Пока сервер не ответил, экран не должен
 * показывать уверенные нули.
 */
export function useCapitalization(query?: any, props?: any) {
  return useRequestQuery(
    [t.CAPITALIZATION, query],
    { method: 'get', url: 'capitalization', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        fromDate: '',
        toDate: '',
        assets: 0,
        liabilities: 0,
        netAssets: 0,
        hasBalance: false,
        profit: 0,
        profitMultiple: null,
        multipleValuation: { value: 0, applicable: false },
        ownershipSharePercent: null,
        ownerValue: { value: 0, applicable: false },
        drivers: [],
      } as Capitalization,
      ...props,
    },
  );
}

/** Множитель прибыли из настроек оценки. */
export function useCapitalizationSettings(props?: any) {
  return useRequestQuery(
    [t.CAPITALIZATION_SETTINGS],
    { method: 'get', url: 'capitalization/settings' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { profitMultiple: null },
      ...props,
    },
  );
}

/** Задать множитель прибыли. Пустое значение снимает настройку. */
export function useSetProfitMultiple(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<any, any, { profitMultiple: number | null }>(
    (values) => apiRequest.put('capitalization/settings', values),
    {
      onSuccess: () => {
        // Обе выборки: от множителя зависит сама оценка, а не только
        // страница настроек.
        queryClient.invalidateQueries(t.CAPITALIZATION_SETTINGS);
        queryClient.invalidateQueries(t.CAPITALIZATION);
      },
      ...props,
    },
  );
}
