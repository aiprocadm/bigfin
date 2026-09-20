// © 2026 Bigfin
import { useMutation, useQueryClient, UseMutationOptions } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';
import { fromApi } from '@/utils/fromApi';

export interface DataQualityPeriodQuery {
  fromDate: string;
  toDate: string;
}

/** Accounts of P&L type without a management article, with their operations. */
export function useDataQualityUnmapped(
  query: DataQualityPeriodQuery,
  props?: any,
) {
  return useRequestQuery(
    [t.DATA_QUALITY_UNMAPPED, query],
    { method: 'get', url: 'data-quality/unmapped-operations', params: query },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: { accounts: [], totalCount: 0 },
      ...props,
    },
  );
}

/** Groups of possibly duplicated entries (same date/account/amount/side). */
export function useDataQualityDuplicates(
  query: DataQualityPeriodQuery,
  props?: any,
) {
  return useRequestQuery(
    [t.DATA_QUALITY_DUPLICATES, query],
    { method: 'get', url: 'data-quality/duplicates', params: query },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: { groups: [], totalGroups: 0 },
      ...props,
    },
  );
}

/** Письма, которые не удалось доставить за последнюю неделю (шаг Ф4). */
export function useDataQualityFailedMails(props?: any) {
  return useRequestQuery(
    [t.DATA_QUALITY_FAILED_MAILS],
    { method: 'get', url: 'data-quality/failed-mails' },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: { count: 0, items: [], truncated: false },
      ...props,
    },
  );
}

/**
 * Счета, у которых хранимый остаток разошёлся с проводками.
 *
 * Продукт держит остаток дважды: в колонке счёта (её показывает шапка) и в
 * проводках (по ним строятся отчёты). Пока они совпадают, о двойственности
 * никто не думает; когда расходятся — экраны спорят друг с другом, и это
 * надо видеть.
 */
export function useDataQualityDriftedBalances(props?: any) {
  return useRequestQuery(
    [t.DATA_QUALITY_DRIFTED_BALANCES],
    { method: 'get', url: 'data-quality/drifted-balances' },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: { rows: [], totalDifference: 0 },
      ...props,
    },
  );
}

/** Документы, у которых дебет не сошёлся с кредитом. */
export function useDataQualityUnbalanced(
  query: DataQualityPeriodQuery,
  props?: any,
) {
  return useRequestQuery(
    [t.DATA_QUALITY_UNBALANCED, query],
    { method: 'get', url: 'data-quality/unbalanced-journals', params: query },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: { journals: [], totalJournals: 0, totalDifference: 0 },
      ...props,
    },
  );
}

/**
 * «Валютные проводки без курса»: ручные проводки, чей журнал лёг один к
 * одному с валютой (вопрос 28 карты v16 — накопились до починки умножения).
 */
export function useDataQualityCrookedJournals(
  query: DataQualityPeriodQuery,
  props?: any,
) {
  return useRequestQuery(
    [t.DATA_QUALITY_CROOKED_CURRENCY, query],
    {
      method: 'get',
      url: 'data-quality/crooked-currency-journals',
      params: query,
    },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: { journals: [], totalJournals: 0, totalDifference: 0 },
      ...props,
    },
  );
}

/**
 * Перепроведение кривых валютных проводок — по явной кнопке; журнал
 * переписывается тем же кодом, что и при обычном сохранении.
 */
export function useRepostCrookedJournals(
  props?: UseMutationOptions<any, any, DataQualityPeriodQuery>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation<any, any, DataQualityPeriodQuery>(
    (query) =>
      apiRequest.post(
        'data-quality/repost-crooked-currency-journals',
        {},
        { params: query },
      ),
    {
      onSuccess: () => {
        client.invalidateQueries(t.DATA_QUALITY_CROOKED_CURRENCY);
        client.invalidateQueries(t.DATA_QUALITY_UNBALANCED);
        client.invalidateQueries(t.FINANCIAL_REPORT);
      },
      ...props,
    },
  );
}

/**
 * Перепроведение документов с НДС за период.
 *
 * Операция меняет журнал, поэтому после неё сбрасываем кэш проверок качества
 * данных и финансовых отчётов — иначе на экране останутся прежние цифры.
 */
export function useRepostVatDocuments(
  props?: UseMutationOptions<any, any, DataQualityPeriodQuery>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation<any, any, DataQualityPeriodQuery>(
    (query) =>
      apiRequest.post('data-quality/repost-vat-documents', {}, { params: query }),
    {
      onSuccess: () => {
        client.invalidateQueries(t.DATA_QUALITY_UNBALANCED);
        client.invalidateQueries(t.DATA_QUALITY_DUPLICATES);
        client.invalidateQueries(t.DATA_QUALITY_PL_CASHFLOW);
        client.invalidateQueries(t.FINANCIAL_REPORT);
        // Отчёт по НДС ходит по собственному ключу, без общего справочника.
        client.invalidateQueries('vat_analysis');
      },
      ...props,
    },
  );
}

/** Monthly P&L vs cash-flow comparison. */
export function useDataQualityPlCashflow(
  query: DataQualityPeriodQuery,
  props?: any,
) {
  return useRequestQuery(
    [t.DATA_QUALITY_PL_CASHFLOW, query],
    { method: 'get', url: 'data-quality/pl-cashflow', params: query },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: { months: [], totals: { plNet: 0, cashNet: 0, diff: 0 } },
      ...props,
    },
  );
}
