import { useMutation, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

/**
 * Create a new currency.
 */
export function useCreateCurrency(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values) => apiRequest.post('currencies', values), {
    onSuccess: () => {
      // Invalidate currencies.
      queryClient.invalidateQueries(t.CURRENCIES);
    },
    ...props,
  });
}

/**
 * Edits the given currency by ID.
 */
export function useEditCurrency(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([currencyId, values]: [any, any]) =>
      apiRequest.put(`currencies/${currencyId}`, values),
    {
      onSuccess: () => {
        // Invalidate currencies.
        queryClient.invalidateQueries(t.CURRENCIES);
      },
      ...props,
    },
  );
}

/**
 * Deletes the given currency.
 */
export function useDeleteCurrency(props: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    (currencyCode) => apiRequest.delete(`currencies/${currencyCode}`),
    {
      onSuccess: () => {
        // Invalidate currencies.
        queryClient.invalidateQueries(t.CURRENCIES);
      },
      ...props,
    },
  );
}

/**
 * Retrieve the currencies list.
 */
export function useCurrencies(props?: any) {
  return useRequestQuery(
    [t.CURRENCIES],
    { method: 'get', url: 'currencies' },
    {
      select: (res: any) => res.data,
      defaultData: [],
      ...props
    },
  );
}
