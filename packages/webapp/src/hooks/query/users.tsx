import { useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import { useSetFeatureDashboardMeta } from '../state/feature';
import t from './types';
import { useSetAuthEmailConfirmed } from '../state';

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: any) => {
  queryClient.invalidateQueries(t.USERS);
};

/**
 * Create a new invite user.
 */
export function useCreateInviteUser(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values: any) => apiRequest.patch('invite', values), {
    onSuccess: () => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Bulk invite users.
 */
export function useBulkCreateInviteUsers(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values: any) => apiRequest.post('invite/bulk', values), {
    onSuccess: () => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Edits the given user.
 */
export function useEditUser(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(([id, values]: [any, any]) => apiRequest.put(`users/${id}`, values), {
    onSuccess: (res, [id, values]) => {
      queryClient.invalidateQueries([t.USER, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

export function useInactivateUser(props: any) {
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();

  return useMutation((userId: any) => apiRequest.put(`users/${userId}/inactivate`), {
    onSuccess: (res, userId) => {
      queryClient.invalidateQueries([t.USER, userId]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

export function useActivateUser(props: any) {
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();

  return useMutation((userId: any) => apiRequest.put(`users/${userId}/activate`), {
    onSuccess: (res, userId) => {
      queryClient.invalidateQueries([t.USER, userId]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Deletes the given user.
 */
export function useDeleteUser(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`users/${id}`), {
    onSuccess: (res, id) => {
      queryClient.invalidateQueries([t.USER, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Retrieves users list.
 */
export function useUsers(props?: any) {
  return useRequestQuery(
    [t.USERS],
    {
      method: 'get',
      url: 'users',
    },
    {
      select: (res: any) => res.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Retrieve details of the given user.
 */
export function useUser(id: any, props: any) {
  return useRequestQuery(
    [t.USER, id],
    {
      method: 'get',
      url: `users/${id}`,
    },
    {
      select: (response: any) => response.data,
      defaultData: {},
      ...props,
    },
  );
}

export function useAuthenticatedAccount(props?: any) {
  const setEmailConfirmed = useSetAuthEmailConfirmed();

  return useRequestQuery(
    ['AuthenticatedAccount'],
    {
      method: 'get',
      url: `auth/account`,
    },
    {
      select: (response: any) => response.data,
      defaultData: {},
      onSuccess: (data: any) => {
        setEmailConfirmed(data.verified, data.email);
      },
      ...props,
    },
  );
}

/**
 * Fetches the dashboard meta.
 */
export const useDashboardMeta = (props: any) => {
  const setFeatureDashboardMeta = useSetFeatureDashboardMeta();

  const state = useRequestQuery(
    [t.DASHBOARD_META],
    { method: 'get', url: 'dashboard/boot' },
    {
      select: (res: any) => res.data,
      defaultData: {},
      ...props,
    },
  );
  useEffect(() => {
    if (state.isSuccess) {
      setFeatureDashboardMeta(state.data);
    }
  }, [state.isSuccess, state.data, setFeatureDashboardMeta]);
  return state;
};
