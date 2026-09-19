import { useMutation, useQueryClient } from 'react-query';
import { batch } from 'react-redux';
import { omit } from 'lodash';
import t from './types';
import useApiRequest from '../useRequest';
import { useRequestQuery } from '../useQueryRequest';
import { useSetOrganizations, useSetSubscriptions } from '../state';

const OrganizationRoute = {
  Current: '/organization/current',
  Build: '/organization/build',
};


/**
 * Retrieve the current organization metadata.
 */
export function useCurrentOrganization(props?: any) {
  const setOrganizations = useSetOrganizations();
  const setSubscriptions = useSetSubscriptions();

  return useRequestQuery(
    [t.ORGANIZATION_CURRENT],
    { method: 'get', url: OrganizationRoute.Current },
    {
      select: (res: any) => res.data,
      defaultData: {},
      onSuccess: (data: any) => {
        const organization = omit(data, ['subscriptions']);

        batch(() => {
          // Sets subscriptions.
          setSubscriptions(data.subscriptions);

          // Sets organizations.
          setOrganizations([organization]);
        });
      },
      ...props,
    },
  );
}

/**
 * Organization setup.
 */
export function useOrganizationSetup() {
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();

  return useMutation(
    (values: Record<string, unknown>) =>
      apiRequest.post(OrganizationRoute.Build, values),
    {
      onSuccess: (res) => {
        queryClient.invalidateQueries(t.ORGANIZATION_CURRENT);
        queryClient.invalidateQueries(t.ORGANIZATIONS);
      },
    },
  );
}

/**
 * Saves the settings.
 */
export function useUpdateOrganization(props = {}) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (information: any) => apiRequest.put('organization', information),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(t.ORGANIZATION_CURRENT);
        queryClient.invalidateQueries(t.ORGANIZATIONS);
      },
      ...props,
    },
  );
}

export function useOrgBaseCurrencyMutateAbilities(props?: any) {
  return useRequestQuery(
    [t.ORGANIZATION_MUTATE_BASE_CURRENCY_ABILITIES],
    { method: 'get', url: `organization/base-currency-mutate` },
    {
      select: (res: any) => res.data.abilities,
      defaultData: [],
      ...props,
    },
  );
}
