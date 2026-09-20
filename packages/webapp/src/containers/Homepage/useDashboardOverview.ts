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

/** Строка блока «Требует внимания» (этап 2 ТЗ, блок 3). */
export interface AttentionItem {
  kind:
    | 'uncategorized'
    | 'cash_gap'
    | 'overdue_receivable'
    | 'pending_payment_requests';
  count?: number;
  amount?: number;
  formattedAmount?: string;
  date?: string;
}

/** Строка Парето по контрагентам (FIN-018 ТЗ-2). */
export interface ParetoRow {
  contactId: number;
  name: string;
  revenue: number;
  /** Доля в выручке, %. */
  sharePercent: number;
  /** Накопительная доля, % — линия на графике. */
  cumulativePercent: number;
  /** Строка «Остальные»: это не контрагент, а свёртка хвоста. */
  isRest?: boolean;
}

export type ConcentrationVerdict =
  | 'SINGLE_CLIENT'
  | 'HIGH_DEPENDENCE'
  | 'MODERATE'
  | 'EVEN';

export interface TopContractors {
  rows: ParetoRow[];
  totalRevenue: number;
  /** Сколько контрагентов дают 80 % выручки. */
  concentrationCount: number | null;
  verdict: ConcentrationVerdict | null;
}

/** Строка блока «Прибыльность направлений» (FIN-018 ТЗ-2). */
export interface DirectionProfitRow {
  projectId: number | null;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  /** Рентабельность, %. `null` — выручки нет, делить не на что. */
  marginPercent: number | null;
  isLoss: boolean;
}

export type DirectionsSortBy = 'profit' | 'margin';

export interface DirectionsProfit {
  rows: DirectionProfitRow[];
  /** Операции без направления — отдельной строкой, а не потеряны. */
  unassigned: DirectionProfitRow | null;
  sortBy: DirectionsSortBy;
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
  attention: AttentionItem[];
  /** «Кто приносит прибыль». `null` — блок не посчитался. */
  topContractors: TopContractors | null;
  /** «Прибыльность направлений». `null` — блок не посчитался. */
  directionsProfit: DirectionsProfit | null;
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
  // Порядок направлений едет ТЕМ ЖЕ запросом: отдельная ручка под блок
  // означала бы второй запрос на главной (FIN-018).
  directionsSortBy: DirectionsSortBy = 'profit',
  options?: UseQueryOptions<DashboardOverview, Error>,
): UseQueryResult<DashboardOverview, Error> {
  const apiRequest = useApiRequest();

  return useQuery<DashboardOverview, Error>(
    ['DASHBOARD_OVERVIEW', period.fromDate, period.toDate, directionsSortBy],
    () =>
      apiRequest
        .get('dashboard/overview', {
          params: {
            from: period.fromDate,
            to: period.toDate,
            directionsSortBy,
          },
        })
        .then((res) => transformToCamelCase(res.data)),
    { keepPreviousData: true, ...options },
  );
}
