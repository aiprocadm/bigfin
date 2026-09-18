// © 2026 Bigfin
import { useMutation, useQueryClient } from 'react-query';

import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

import type { LegalEntityRow } from '@/containers/LegalEntities/legalEntityView';

/**
 * Справочник юрлиц (этап 6 ТЗ, §6.4).
 *
 * Список никогда не приходит пустым: сервер при первом обращении создаёт
 * юрлицо по умолчанию из реквизитов организации.
 */
export function useLegalEntities(props?: any) {
  return useRequestQuery(
    [t.LEGAL_ENTITIES],
    { method: 'get', url: 'legal-entities' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: [] as LegalEntityRow[],
      ...props,
    },
  );
}

/** Общее обновление списка после любой правки. */
const useInvalidateLegalEntities = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries(t.LEGAL_ENTITIES);
};

export function useCreateLegalEntity(props?: any) {
  const apiRequest = useApiRequest();
  const invalidate = useInvalidateLegalEntities();

  return useMutation(
    (values: any) => apiRequest.post('legal-entities', values),
    { onSuccess: () => invalidate(), ...props },
  );
}

export function useEditLegalEntity(props?: any) {
  const apiRequest = useApiRequest();
  const invalidate = useInvalidateLegalEntities();

  return useMutation(
    ([id, values]: [number, any]) =>
      apiRequest.put(`legal-entities/${id}`, values),
    { onSuccess: () => invalidate(), ...props },
  );
}

export function useDeleteLegalEntity(props?: any) {
  const apiRequest = useApiRequest();
  const invalidate = useInvalidateLegalEntities();

  return useMutation((id: number) => apiRequest.delete(`legal-entities/${id}`), {
    onSuccess: () => invalidate(),
    ...props,
  });
}
