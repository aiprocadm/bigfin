import React from 'react';
import intl from 'react-intl-universal';
import { useQuery } from 'react-query';

import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';
import { Button } from '@/components/ui/button';

/**
 * Итоги реестра операций (FIN-008 ТЗ-2).
 *
 * ЗАЧЕМ. Наложив фильтр, человек не знал, сколько операций попало в выборку
 * и на какую сумму, — и выгружал в Excel, чтобы сложить.
 *
 * ОТДЕЛЬНЫЙ ЗАПРОС, А НЕ ПОЛЕ СПИСКА. Список идёт бесконечной прокруткой:
 * тащить агрегаты в каждую страницу значит пересчитывать их на каждый
 * скролл.
 *
 * ПЕРЕВОДЫ НЕ В ИТОГЕ. Перевод со своего счёта на свой денег не прибавляет;
 * попади он в поступления — итог показал бы рост, которого не было.
 * Показывается отдельным числом, чтобы его наличие было видно.
 */
export function TransactionsSummaryBar({ filters }: { filters: any }) {
  const apiRequest = useApiRequest();

  const { data, isError, refetch } = useQuery(
    ['ALL_TRANSACTIONS_SUMMARY', filters],
    () =>
      apiRequest
        .get('banking/transactions/summary', { params: filters })
        .then((res: any) => transformToCamelCase(res.data)),
    { keepPreviousData: true },
  );

  const summary: any = data ?? {};

  return (
    <div className="sticky bottom-0 z-10 flex h-10 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-surface px-3 text-sm">
      {isError ? (
        /* Сбой агрегатов НЕ ломает список: он и без итогов полезен. */
        <>
          <span className="text-text-secondary">—</span>
          <Button variant="secondary" onClick={() => refetch()}>
            {intl.get('retry')}
          </Button>
        </>
      ) : (
        <>
          <span className="tabular-nums">
            {intl.get('all_transactions.summary.count', {
              count: summary.count ?? 0,
            })}
          </span>
          <span className="hidden text-text-secondary sm:inline">
            {intl.get('all_transactions.summary.inflow')}{' '}
            <span className="tabular-nums text-text-primary">
              {summary.inflow?.formatted ?? '—'}
            </span>
          </span>
          <span className="hidden text-text-secondary sm:inline">
            {intl.get('all_transactions.summary.outflow')}{' '}
            <span className="tabular-nums text-text-primary">
              {summary.outflow?.formatted ?? '—'}
            </span>
          </span>
          <span className="hidden text-text-secondary md:inline">
            {intl.get('all_transactions.summary.transfers')}{' '}
            <span className="tabular-nums text-text-primary">
              {summary.transfers?.formatted ?? '—'}
            </span>
          </span>
          <span className="ml-auto font-medium">
            {intl.get('all_transactions.summary.net')}{' '}
            <span
              className={
                (summary.net?.amount ?? 0) > 0
                  ? 'tabular-nums text-success'
                  : 'tabular-nums text-text-primary'
              }
            >
              {summary.net?.formatted ?? '—'}
            </span>
          </span>
          {summary.hasForeignCurrency && (
            /* Молча сложить разные валюты — самый тихий способ соврать. */
            <span className="w-full text-xs text-text-secondary sm:w-auto">
              {intl.get('all_transactions.summary.foreign_currency')}
            </span>
          )}
        </>
      )}
    </div>
  );
}
