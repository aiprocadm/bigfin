// © 2026 Bigfin
import { useQuery } from 'react-query';

import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';

import type { PlanFactData } from './planFactColumns';

/**
 * План по строкам отчёта (этап 4 ТЗ, п. 4.4).
 *
 * Отдельная лёгкая ручка: отчёт и так тяжёлый, а план нужен не всегда —
 * без заведённого бюджета сервер отвечает `available: false`, и колонок
 * не будет вовсе.
 *
 * Сбой запроса не должен закрывать отчёт: цифры важнее колонки плана,
 * поэтому ошибка молча превращается в «плана нет».
 */
export function useReportPlanFact(
  report: 'profit_loss' | 'cash_flow',
  fromDate?: string,
  toDate?: string,
): PlanFactData | undefined {
  const apiRequest = useApiRequest();

  const { data, isError } = useQuery(
    ['REPORT_PLAN_FACT', report, fromDate, toDate],
    () =>
      apiRequest
        .get('financial-reports/plan-fact', {
          params: { report, from: fromDate, to: toDate },
        })
        .then((res: any) => transformToCamelCase(res.data) as PlanFactData),
    { enabled: Boolean(fromDate && toDate), keepPreviousData: true },
  );

  if (isError) return undefined;
  return data;
}
