import { useQuery } from 'react-query';
import { castArray, defaultTo } from 'lodash';
import { useAuthOrganizationId } from './state';
import useApiRequest from './useRequest';
import { normalizeApiPath } from '../utils';
import { useRef } from 'react';

/**
 * Query for tenant requests.
 */
export function useQueryTenant(query: any, callback: any, props: any) {
  const organizationId = useAuthOrganizationId();

  return useQuery([...castArray(query), organizationId], callback, props);
}

export function useRequestQuery(query: any, axios: any, props: any) {
  const apiRequest = useApiRequest();

  const states = useQuery(
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
