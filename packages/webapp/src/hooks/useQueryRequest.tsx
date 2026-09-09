import { useQuery } from 'react-query';
import type { UseQueryResult } from 'react-query';
import { castArray, defaultTo } from 'lodash';
import { useAuthOrganizationId } from './state';
import useApiRequest from './useRequest';
import { normalizeApiPath } from '../utils';
import { useRef } from 'react';

/**
 * Query for tenant requests.
 *
 * Вид данных назван списком с запасным значением `any`. Без него `select` из
 * необъявленных настроек не виден, и `data` получалась «неизвестно» — а
 * значит, каждый экран, объявивший форму своих данных, ловил расхождение
 * (Д26 карты v82). Кто знает форму — пишет её: `useQueryTenant<Contact[]>(…)`.
 */
export function useQueryTenant<TData = any>(
  query: any,
  callback: any,
  props: any,
): UseQueryResult<TData, Error> {
  const organizationId = useAuthOrganizationId();

  return useQuery<any, Error, TData>(
    [...castArray(query), organizationId],
    callback,
    props,
  );
}

export function useRequestQuery<TData = any>(
  query: any,
  axios: any,
  props: any,
) {
  const apiRequest = useApiRequest();

  const states = useQuery<any, Error, TData>(
    query,
    () =>
      apiRequest.http({
        ...axios,
        url: `/api/${normalizeApiPath(axios.url)}`,
      }),
    props,
  );
  // Momerize the default data.
  const defaultData = useRef(props.defaultData || undefined);

  return {
    ...states,
    data: defaultTo(states.data, defaultData.current),
  };
}
