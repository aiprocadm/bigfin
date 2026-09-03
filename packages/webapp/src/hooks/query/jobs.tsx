import { transformToCamelCase } from '@/utils';
import { useRequestQuery } from '../useQueryRequest';

/**
 * Retrieve the job metadata.
 */
export function useJob(jobId: any, props = {}) {
  return useRequestQuery(
    ['JOB', jobId],
    { method: 'get', url: `organization/build/${jobId}` },
    {
      select: (res: any) => transformToCamelCase(res.data),
      defaultData: {},
      ...props,
    },
  );
}
