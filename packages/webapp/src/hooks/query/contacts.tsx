import { useMutation, useQueryClient } from 'react-query';
import useApiRequest from '../useRequest';
import { useQueryTenant } from '../useQueryRequest';
import t from './types';

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: any) => {
  // Invalidate vendors.
  queryClient.invalidateQueries(t.VENDORS);
  // Invalidate customers.
  queryClient.invalidateQueries(t.CUSTOMERS);
};

/**
 * Retrieve the contact duplicate.
 */
export function useContact(id: any, props: any) {
  const apiRequest = useApiRequest();

  return useQueryTenant(
    ['CONTACT', id],
    () => apiRequest.get(`contacts/${id}`),
    {
      select: (res: any) => res.data.customer,
      ...props,
    },
  );
}

/**
 * Retrieve the auto-complete contacts.
 */
export function useAutoCompleteContacts(props: any) {
  const apiRequest = useApiRequest();

  return useQueryTenant(
    ['CONTACTS', 'AUTO-COMPLETE'],
    () => apiRequest.get('contacts/auto-complete'),
    {
      select: (res: any) => res.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Activate the given Contact.
 */
export function useActivateContact(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.patch(`contacts/${id}/activate`), {
    onSuccess: (res, id) => {
      // Invalidate specific contact.
      queryClient.invalidateQueries([t.CONTACT, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Inactivate the given contact.
 */
export function useInactivateContact(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.patch(`contacts/${id}/inactivate`), {
    onSuccess: (res, id) => {
      // Invalidate specific item.
      queryClient.invalidateQueries([t.CONTACT, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}
