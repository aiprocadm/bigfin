
import { useRequestQuery } from '@/hooks/useQueryRequest';
import t from './type';

/**
 *
 * @param projectId - Project id.
 * @param query
 * @param props
 * @returns
 */
export function useProjectBillableEntries(projectId: any, query: any, props: any) {
  return useRequestQuery(
    [t.PROJECT_BILLABLE_ENTRIES, projectId, query],
    {
      method: 'get',
      url: `projects/${projectId}/billable/entries`,
      params: query,
    },
    {
      select: (res: any) => res.data.billable_entries,
      defaultData: {},
      ...props,
    },
  );
}
