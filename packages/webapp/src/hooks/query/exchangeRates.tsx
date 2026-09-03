import { useQuery } from 'react-query';
import QUERY_TYPES from './types';
import useApiRequest from '../useRequest';

interface LatestExchangeRateQuery {
  fromCurrency?: string;
  toCurrency?: string;
  /** Дата курса (YYYY-MM-DD); без неё — курс на сегодня (К1 карты v17). */
  date?: string;
}

/**
 * Retrieves latest exchange rate.
 * @param {number} customerId - Customer id.
 */
export function useLatestExchangeRate(
  { toCurrency, fromCurrency, date }: LatestExchangeRateQuery,
  props: any,
) {
  const apiRequest = useApiRequest();

  return useQuery(
    [QUERY_TYPES.EXCHANGE_RATE, toCurrency, fromCurrency, date],
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
            date,
          },
        })
        .then((res) => res.data),
    props,
  );
}
