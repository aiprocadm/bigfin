import { useMutation, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';
import type {
  QueryCacheClient,
  QueryHookOptions,
} from './hookTypes';

// Номер записи МОЖЕТ БЫТЬ НЕ ИЗВЕСТЕН: шторка ещё не открыта, окно
// предпросмотра не выбрало документ. Запрос в этом случае просто не
// выполняется. Требовать номер всегда значило бы заставить каждого
// вызывающего врать — подставлять ноль или пустую строку.

/** Ответ сервера: разбирается прямо в хуке. */
type ApiResponse = { data: any };

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: QueryCacheClient) => {
  queryClient.invalidateQueries(t.ROLE);
  queryClient.invalidateQueries(t.ROLES);
  queryClient.invalidateQueries(t.ROLES_PERMISSIONS_SCHEMA);
};

/**
 * Edit role .
 */
export function useEditRolePermissionSchema(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`roles/${id}`, values),
    {
      onSuccess: () => {
        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Create a new roles
 */
export function useCreateRolePermissionSchema(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values: any) => apiRequest.post(`roles`, values), {
    onSuccess: () => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Delete the given role.
 */
export function useDeleteRole(props?: QueryHookOptions) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`roles/${id}`), {
    onSuccess: (res, id) => {
      // Invalidate specific role.
      queryClient.invalidateQueries([t.ROLE, id]);

      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Retrive the roles permissions schema.
 */
export function usePermissionsSchema(
  query?: Record<string, any>,
  props?: QueryHookOptions,
) {
  return useRequestQuery(
    [t.ROLES_PERMISSIONS_SCHEMA, query],
    { method: 'get', url: 'roles/permissions/schema', params: query },
    {
      select: (res: ApiResponse) => res.data,
      defaultData: {
        roles: [],
      },
      ...props,
    },
  );
}

/**
 * Retrieve the role permisstion schema.
 * @param {number} role_id - role id.
 */
export function useRolePermission(role_id: number | string | null | undefined, props?: QueryHookOptions, requestProps?: QueryHookOptions) {
  return useRequestQuery(
    [t.ROLE, role_id],
    { method: 'get', url: `roles/${role_id}`, ...requestProps },
    {
      select: (res: ApiResponse) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

/**
 * Роль пользователя в организации — так, как её отдаёт сервер
 * (см. модель `Role` на сервере).
 */
export interface IUserRole {
  id: number;
  name: string;
  description: string;
  slug: string;
  predefined: boolean;
}

/**
 * Retrieve the roles.
 */
export function useRoles(
  props?: QueryHookOptions,
  query?: Record<string, any>,
) {
  return useRequestQuery<IUserRole[]>(
    [t.ROLES, query],
    { method: 'get', url: `roles`, params: query },
    {
      select: (res: ApiResponse) => res.data,
      defaultData: [],
      ...props,
    },
  );
}
