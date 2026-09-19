// © 2026 Bigfin
import { useMutation, useQueryClient } from 'react-query';

import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

import { fromApi } from '@/utils/fromApi';
import type { ProjectRow } from '@/containers/Directions/directionView';

/**
 * Справочник направлений (проектов).
 *
 * Поля «Проект» стояли в формах операций с самого начала, но заводить
 * направления было негде: серверных ручек не существовало ни одной, и поля
 * всегда оставались пустыми.
 */
export function useDirections(props?: any) {
  return useRequestQuery(
    [t.PROJECTS],
    { method: 'get', url: 'projects' },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: [] as ProjectRow[],
      ...props,
    },
  );
}

/** Общее обновление списка после любой правки. */
const useInvalidateDirections = () => {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries(t.PROJECTS);
};

export function useCreateDirection(props?: any) {
  const apiRequest = useApiRequest();
  const invalidate = useInvalidateDirections();

  return useMutation((values: any) => apiRequest.post('projects', values), {
    onSuccess: () => invalidate(),
    ...props,
  });
}

export function useEditDirection(props?: any) {
  const apiRequest = useApiRequest();
  const invalidate = useInvalidateDirections();

  return useMutation(
    ([id, values]: [number, any]) => apiRequest.put(`projects/${id}`, values),
    { onSuccess: () => invalidate(), ...props },
  );
}

export function useDeleteDirection(props?: any) {
  const apiRequest = useApiRequest();
  const invalidate = useInvalidateDirections();

  return useMutation((id: number) => apiRequest.delete(`projects/${id}`), {
    onSuccess: () => invalidate(),
    ...props,
  });
}
