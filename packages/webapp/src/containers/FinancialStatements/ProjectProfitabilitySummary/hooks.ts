import { useRequestQuery } from '@/hooks/useQueryRequest';
import t from '@/hooks/query/types';

/**
 * Retrieve the profitability summary for the project
 */
export function useProjectProfitabilitySummary(query: any, props: any) {
  return useRequestQuery(
    [t.FINANCIAL_REPORT, t.PROJECT_PROFITABILITY_SUMMARY, query],
    {
      method: 'get',
      url: '/financial_statements/project-profitability-summary',
      params: query,
      headers: {
        Accept: 'application/json+table',
      },
    },
    {
      select: (res: any) => ({
        columns: res.data.table.columns,
        tableRows: res.data.table.data,
      }),
      defaultData: {
        tableRows: [],
        columns: [],
      },
      ...props,
    },
  );
}
