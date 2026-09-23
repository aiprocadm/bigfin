// © 2026 Bigfin
import { useMutation, useQuery, useQueryClient } from 'react-query';

import useApiRequest from '../useRequest';
import {
  parseSavedFilters,
  type SavedRegistryFilter,
} from '@/containers/CashFlow/AllTransactions/savedRegistryFilters';

/**
 * Сохранённые фильтры реестра (FT-021 ТЗ-3). Личные — в настройках
 * человека (`registryFilters`), общие для организации — в настройках
 * организации (`registry.shared_filters`, JSON-строкой).
 */
const PERSONAL = 'REGISTRY_FILTERS_PERSONAL';
const SHARED = 'REGISTRY_FILTERS_SHARED';

export function useSavedRegistryFilters() {
  const api = useApiRequest();
  const personal = useQuery<SavedRegistryFilter[]>([PERSONAL], () =>
    api
      .get('settings/display-preferences')
      .then((res) => parseSavedFilters(res.data?.registryFilters ?? res.data?.registry_filters, false)),
  );
  const shared = useQuery<SavedRegistryFilter[]>([SHARED], () =>
    api.get('settings').then((res) => {
      const rows: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const row = rows.find((item) => item.group === 'registry' && item.key === 'shared_filters');
      return parseSavedFilters(row?.value, true);
    }),
  );
  return {
    personal: personal.data ?? [],
    shared: shared.data ?? [],
    isLoading: personal.isLoading || shared.isLoading,
  };
}

/** Сохранить весь список одной области: личной или общей. */
export function useSaveRegistryFilters() {
  const api = useApiRequest();
  const client = useQueryClient();
  return useMutation(
    ({ shared, list }: { shared: boolean; list: SavedRegistryFilter[] }) => {
      const plain = list.map(({ id, name, filters }) => ({ id, name, filters }));
      return shared
        ? api.put('settings', {
            options: [{ group: 'registry', key: 'shared_filters', value: JSON.stringify(plain) }],
          })
        : api.put('settings/display-preferences', { registryFilters: plain });
    },
    {
      onSuccess: (_data, { shared }) => client.invalidateQueries(shared ? SHARED : PERSONAL),
    },
  );
}
