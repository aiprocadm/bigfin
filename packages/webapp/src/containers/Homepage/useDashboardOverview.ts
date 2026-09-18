// Хуки запросов в этом слое не типизированы: `useApiRequest` описан без
// дженериков, и строгая типизация здесь спорит с ним, а не помогает.
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';

export interface OverviewAmount {
  amount: number;
  formattedAmount: string;
}

export interface OverviewTile extends OverviewAmount {
  previousAmount: number;
  /** Изменение к прошлому периоду, проценты. `null` — сравнивать не с чем. */
  changePercent: number | null;
}

export interface OverviewMonth {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface OverviewAccount {
  id: number;
  name: string;
  amount: number;
  formattedAmount: string;
}

export interface OverviewExpenseShare {
  id: number | null;
  name: string;
  amount: number;
  formattedAmount: string;
  sharePercent: number;
}

export interface DashboardOverview {
  period: { fromDate: string; toDate: string };
  tiles: {
    cashBalance: OverviewAmount;
    income: OverviewTile;
    expenses: OverviewTile;
    netProfit: OverviewTile & { marginPercent: number | null };
  };
  months: OverviewMonth[];
  accounts: OverviewAccount[];
  topExpenses: OverviewExpenseShare[];
  currencyCode: string;
}

/**
 * Всё для главной одним запросом (этап 2 ТЗ, п. 2.3).
 *
 * Пять отдельных запросов на главной недопустимы: показатели, ряды графика,
 * остатки по счетам и топ статей расходов приходят вместе. Доходы и расходы
 * сервер берёт из отчёта о прибылях и убытках — суммы совпадают с разделом
 * «Отчёты».
 */
export function useDashboardOverview(
  period: { fromDate: string; toDate: string },
  options?: UseQueryOptions<DashboardOverview, Error>,
): UseQueryResult<DashboardOverview, Error> {
  const apiRequest = useApiRequest();

  return useQuery<DashboardOverview, Error>(
    ['DASHBOARD_OVERVIEW', period.fromDate, period.toDate],
    () =>
      apiRequest
        .get('dashboard/overview', {
          params: { from: period.fromDate, to: period.toDate },
        })
        .then((res) => transformToCamelCase(res.data)),
    { keepPreviousData: true, ...options },
  );
}
