// Хуки запросов в этом слое не типизированы: `useApiRequest` описан без
// дженериков, и строгая типизация здесь спорит с ним, а не помогает.
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';

import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';

/** Сколько ответ считается свежим. Столько же живёт кэш на сервере. */
export const MONEY_WIDGET_STALE_MS = 60_000;

/**
 * Виджет денег в шапке (FIN-006 ТЗ-2).
 *
 * `staleTime` В МИНУТУ — не украшение. Шапка есть на КАЖДОМ экране, и без
 * него каждый переход между разделами порождал бы новый запрос. Значение
 * совпадает с жизнью серверного кэша: два слоя, один срок, никакой
 * рассинхронизации «клиент просит, сервер отдаёт старое».
 */
export function useMoneyWidget(
  options?: UseQueryOptions<any, Error>,
): UseQueryResult<any, Error> {
  const apiRequest = useApiRequest();

  return useQuery<any, Error>(
    ['DASHBOARD_MONEY_WIDGET'],
    () =>
      apiRequest
        .get('dashboard/money-widget', {})
        .then((res: any) => transformToCamelCase(res.data)),
    {
      staleTime: MONEY_WIDGET_STALE_MS,
      // Виджет — подсказка, а не сам экран: молчать при сбое лучше, чем
      // ронять шапку, без которой человек не сможет никуда уйти.
      retry: false,
      ...options,
    },
  );
}
