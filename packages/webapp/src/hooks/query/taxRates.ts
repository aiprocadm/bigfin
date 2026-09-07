import { useMutation, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import QUERY_TYPES from './types';
import useApiRequest from '../useRequest';

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: any) => {
  queryClient.invalidateQueries(QUERY_TYPES.TAX_RATES);
};

/**
 * Retrieves tax rates.
 * @param {number} customerId - Customer id.
 */
export function useTaxRates(props?: any) {
  return useRequestQuery(
    [QUERY_TYPES.TAX_RATES],
    {
      method: 'get',
      url: `tax-rates`,
    },
    {
      select: (res: any) => res.data.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Retrieves tax rate.
 * @param {number} taxRateId - Tax rate id.
 */
export function useTaxRate(taxRateId: string, props: any) {
  return useRequestQuery(
    [QUERY_TYPES.TAX_RATES, taxRateId],
    {
      method: 'get',
      url: `tax-rates/${taxRateId}`,
    },
    {
      select: (res: any) => res.data,
      ...props,
    },
  );
}

/**
 * Edit the given tax rate.
 */
export function useEditTaxRate(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`tax-rates/${id}`, values),
    {
      onSuccess: (res, id) => {
        commonInvalidateQueries(queryClient);
        queryClient.invalidateQueries([QUERY_TYPES.TAX_RATES, id]);
        queryClient.invalidateQueries(QUERY_TYPES.ITEM);
        queryClient.invalidateQueries(QUERY_TYPES.ITEMS);
      },
      ...props,
    },
  );
}

/**
 * Creates a new tax rate.
 */
export function useCreateTaxRate(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values) => apiRequest.post('tax-rates', values), {
    onSuccess: (res, id) => {
      commonInvalidateQueries(queryClient);
      queryClient.invalidateQueries([QUERY_TYPES.TAX_RATES, id]);
    },
    ...props,
  });
}

/**
 * Delete the given tax rate.
 */
export function useDeleteTaxRate(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.delete(`tax-rates/${id}`), {
    onSuccess: (res, id) => {
      commonInvalidateQueries(queryClient);
      queryClient.invalidateQueries([QUERY_TYPES.TAX_RATES, id]);
    },
    ...props,
  });
}

/**
 * Activate the given tax rate.
 */
export function useActivateTaxRate(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.put(`tax-rates/${id}/activate`), {
    onSuccess: (res, id) => {
      commonInvalidateQueries(queryClient);
      queryClient.invalidateQueries([QUERY_TYPES.TAX_RATES, id]);
    },
    ...props,
  });
}

/**
 * Inactivate the given tax rate.
 */
export function useInactivateTaxRate(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.put(`tax-rates/${id}/inactivate`), {
    onSuccess: (res, id) => {
      commonInvalidateQueries(queryClient);
      queryClient.invalidateQueries([QUERY_TYPES.TAX_RATES, id]);
    },
    ...props,
  });
}
