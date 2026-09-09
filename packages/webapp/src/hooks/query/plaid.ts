import { useMutation } from 'react-query';
import useApiRequest from '../useRequest';

/**
 * Retrieves the plaid link token.
 */
export function useGetPlaidLinkToken(props = {}) {
  const apiRequest = useApiRequest();

  return useMutation(
    () => apiRequest.post('banking/plaid/link-token', {}, {}),
    {
      ...props,
    },
  );
}

/**
 * Retrieves the plaid link token.
 */
export interface PlaidExchangeTokenValues {
  public_token: string;
  institution_id?: string;
}

export function usePlaidExchangeToken(props = {}) {
  const apiRequest = useApiRequest();

  // Вид довода назван: без него `useMutation` считает, что обмен не принимает
  // ничего, и вызов с телом запроса — ошибка (Д4 карты v83).
  return useMutation<any, Error, PlaidExchangeTokenValues>(
    (data) => apiRequest.post('banking/plaid/exchange-token', data, {}),
    {
      ...props,
    },
  );
}
