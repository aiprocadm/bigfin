import { useRequestQuery } from '../../useQueryRequest';
import t from '../types';
/**
 * Retrieve transactions by reference report.
 */
export function useTransactionsByReference(query: any, props: any) {
  return useRequestQuery(
    [t.TRANSACTIONS_BY_REFERENCE, query],
    {
      method: 'get',
      url: `/reports/transactions-by-reference`,
      params: query,
    },
    {
      select: (res: any) => res.data,
      defaultData: {
        transactions: [],
      },
      ...props,
    },
  );
}
