import { useQueryClient, useMutation } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: any) => {
  // Invalidate warehouses.
  queryClient.invalidateQueries(t.BRANCHES);
  queryClient.invalidateQueries(t.BRANCH);

  queryClient.invalidateQueries(t.DASHBOARD_META);

};

/**
 * Create a new branch.
 */
export function useCreateBranch(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values: any) => apiRequest.post('branches', values), {
    onSuccess: (res, values) => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Edits the given branch.
 */
export function useEditBranch(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`branches/${id}`, values),
    {
      onSuccess: (res, [id, values]) => {
        // Invalidate specific branch.
        queryClient.invalidateQueries([t.BRANCH, id]);

        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Deletes the given branch.
 */
export function useDeleteBranch(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`branches/${id}`), {
    onSuccess: (res, id) => {
      // Invalidate specific branch.
      queryClient.invalidateQueries([t.BRANCH, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Retrieve Branches list.
 */
export function useBranches(query: any, props: any) {
  return useRequestQuery(
    [t.BRANCHES, query],
    { method: 'get', url: 'branches', params: query },
    {
      select: (res: any) => res.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Retrieve the branch details.
 * @param {number}
 */
export function useBranch(id: any, props: any, requestProps?: any) {
  return useRequestQuery(
    [t.BRANCH, id],
    { method: 'get', url: `branches/${id}`, ...requestProps },
    {
      select: (res: any) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

/**
 * Activate the given branches.
 */
export function useActivateBranches(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.post(`branches/activate`), {
    onSuccess: (res, id) => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Mark primary the given branch.
 */
export function useMarkBranchAsPrimary(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.post(`branches/${id}/mark-primary`), {
    onSuccess: (res, id) => {
      // Invalidate specific inventory adjustment.
      queryClient.invalidateQueries([t.BRANCH, id]);

      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}
