// Хуки запросов в этом слое не типизированы: `useApiRequest` описан без
// дженериков, и строгая типизация здесь спорит с ним, а не помогает.
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';

export interface MoneySummaryAmount {
  amount: number;
  formattedAmount: string;
}

export interface MoneySummary {
  cashBalance: MoneySummaryAmount;
  receivable: MoneySummaryAmount;
  receivableOverdue: MoneySummaryAmount;
  payable: MoneySummaryAmount;
  payableOverdue: MoneySummaryAmount;
  /** Ближайшие платежи за неделю вперёд и день ближайшего (Р3 карты v21). */
  upcomingPayments: MoneySummaryAmount;
  upcomingPaymentsDate: string | null;
  /** Оценка налога на упрощёнке за квартал (Н3 карты v22); null — нет. */
  taxEstimate: MoneySummaryAmount | null;
  taxEstimateRatePercent: number | null;
  taxEstimateDueDate: string | null;
  currencyCode: string;
}

/**
 * Сводка «как дела с деньгами» для главной (Г2 карты v20).
 * Считает сервер — теми же отчётами, что показывают разделы продукта.
 */
export function useMoneySummary(
  options?: UseQueryOptions<MoneySummary, Error>,
): UseQueryResult<MoneySummary, Error> {
  const apiRequest = useApiRequest();

  return useQuery<MoneySummary, Error>(
    ['DASHBOARD_MONEY_SUMMARY'],
    () =>
      apiRequest
        .get('dashboard/money-summary', {})
        .then((res) => transformToCamelCase(res.data)),
    { ...options },
  );
}
