// @ts-nocheck
import { useQuery } from 'react-query';
import QUERY_TYPES from './types';
import useApiRequest from '../useRequest';

interface LatestExchangeRateQuery {
  fromCurrency?: string;
  toCurrency?: string;
}

/**
 * Retrieves latest exchange rate.
 * @param {number} customerId - Customer id.
 */
export function useLatestExchangeRate(
  { toCurrency, fromCurrency }: LatestExchangeRateQuery,
  props,
) {
  const apiRequest = useApiRequest();

  return useQuery(
    [QUERY_TYPES.EXCHANGE_RATE, toCurrency, fromCurrency],
    () =>
      apiRequest
        .http({
          // Был `exchange_rates` (подчёркивание) — сервер отвечает только на
          // `exchange-rates`, запрос всегда падал 404 (С2 карты v14).
          url: `/api/exchange-rates/latest`,
          method: 'get',
          params: {
            to_currency: toCurrency,
            from_currency: fromCurrency,
          },
        })
        .then((res) => res.data),
    props,
  );
}
