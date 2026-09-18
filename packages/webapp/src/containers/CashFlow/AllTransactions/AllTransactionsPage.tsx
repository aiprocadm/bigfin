import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { useHistory, useLocation } from 'react-router-dom';
import { flatten, map } from 'lodash';

import { DashboardInsider } from '@/components';
import { PageHeader } from '@/components/ui/page-header';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { DataTable } from '@/components/ui/data-table';
import { DatePicker } from '@/components/ui/date-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useAllTransactionsInfinity,
  useAllUncategorizedInfinity,
} from '@/hooks/query/cashflowAccounts';
import { useAccounts, useCashflowAccounts } from '@/hooks/query';
import { useAllTransactionsColumns } from './useAllTransactionsColumns';
import { useUncategorizedColumns } from './useUncategorizedColumns';
import {
  defaultPeriod,
  filtersFromSearch,
  searchFromFilters,
  serverFilters,
  type ScreenFilters,
} from './allTransactionsFilters';

/** Ключ строки: у операций нет своего номера, сервер различает их парой ссылок. */
const getRowId = (row: any) => `${row.reference_type}-${row.reference_id}`;

/** У строк выписки свой номер есть. */
const getUncategorizedRowId = (row: any) => String(row.id);

const toDate = (value?: string) => (value ? moment(value).toDate() : undefined);
const fromDate = (value?: Date) =>
  value ? moment(value).format('YYYY-MM-DD') : undefined;

/**
 * Экран «Операции» — список по ВСЕМ счетам сразу (этап 3 ТЗ).
 *
 * До него операции можно было смотреть только внутри одного счёта, и вопрос
 * «что было с деньгами в марте» требовал обойти все счета по очереди.
 *
 * Счёт здесь — обычный отбор. Отборы живут в адресной строке: ссылку можно
 * переслать, и при возврате на экран вид сохраняется.
 */
export default function AllTransactionsPage() {
  const history = useHistory();
  const location = useLocation();

  // Отборы читаем из адреса; период по умолчанию — текущий месяц.
  const filters = React.useMemo<ScreenFilters>(() => {
    const fromUrl = filtersFromSearch(location.search);

    return fromUrl.fromDate || fromUrl.toDate
      ? fromUrl
      : { ...defaultPeriod(), ...fromUrl };
  }, [location.search]);

  const setFilters = React.useCallback(
    (next: ScreenFilters) => {
      history.replace({
        pathname: location.pathname,
        search: searchFromFilters(next),
      });
    },
    [history, location.pathname],
  );

  const patch = React.useCallback(
    (part: Partial<ScreenFilters>) => setFilters({ ...filters, ...part }),
    [filters, setFilters],
  );

  // Режим «ждут разноски»: отдельный список строк выписки без статьи.
  const isAwaiting = filters.status === 'uncategorized';

  const query = serverFilters(filters);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isSuccess,
  } = useAllTransactionsInfinity(query, { enabled: !isAwaiting });

  // Непроведённые запрашиваются всегда: их число нужно полосе даже тогда,
  // когда открыт обычный список.
  const {
    data: awaitingData,
    isLoading: isAwaitingLoading,
    isFetchingNextPage: isAwaitingFetchingNext,
    hasNextPage: hasAwaitingNextPage,
    fetchNextPage: fetchAwaitingNextPage,
    isSuccess: isAwaitingSuccess,
  } = useAllUncategorizedInfinity({
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    accountId: filters.accountId,
  });

  const { data: accounts = [] } = useCashflowAccounts();

  // План счетов нужен только в режиме разноски — в обычном списке не грузим.
  const { data: chartAccounts = [] } = useAccounts(undefined, {
    enabled: isAwaiting,
  });

  const transactions = React.useMemo(
    () => (isSuccess ? flatten(map((data as any)?.pages, (p: any) => p.transactions)) : []),
    [data, isSuccess],
  );
  const awaiting = React.useMemo(
    () =>
      isAwaitingSuccess
        ? flatten(map((awaitingData as any)?.pages, (p: any) => p.data))
        : [],
    [awaitingData, isAwaitingSuccess],
  );

  const total = (data as any)?.pages?.[0]?.pagination?.total ?? 0;
  const awaitingTotal = (awaitingData as any)?.pages?.[0]?.pagination?.total ?? 0;

  const columns = useAllTransactionsColumns();
  const awaitingColumns = useUncategorizedColumns(chartAccounts as any[]);

  // Что показываем сейчас — обычный список или «ждут разноски».
  const rows = isAwaiting ? awaiting : transactions;
  const shownTotal = isAwaiting ? awaitingTotal : total;

  return (
    <DashboardInsider name={'all-transactions'}>
      <div className="bigfin-ui min-h-full bg-background p-4 sm:p-6">
        <div className="mx-auto flex max-w-[1400px] flex-col">
          <PageHeader
            title={intl.get(
              isAwaiting
                ? 'all_transactions.awaiting.title'
                : 'all_transactions.title',
            )}
          />

          {/*
            Полоса состояния из п. 3.1 ТЗ: сколько операций ждёт статьи и
            вход в разноску одним нажатием. Показываем только когда есть что
            разносить — пустая полоса ничего не сообщает.
          */}
          {awaitingTotal > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2">
              <span className="text-sm text-text-primary">
                {intl.get('all_transactions.awaiting.banner', {
                  count: awaitingTotal,
                })}
              </span>
              <Button
                variant={isAwaiting ? 'secondary' : 'primary'}
                onClick={() =>
                  patch({ status: isAwaiting ? undefined : 'uncategorized' })
                }
              >
                {intl.get(
                  isAwaiting
                    ? 'all_transactions.awaiting.back'
                    : 'all_transactions.awaiting.show',
                )}
              </Button>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <DatePicker
              value={toDate(filters.fromDate)}
              onChange={(date) => patch({ fromDate: fromDate(date) })}
            />
            <span className="text-text-secondary">—</span>
            <DatePicker
              value={toDate(filters.toDate)}
              onChange={(date) => patch({ toDate: fromDate(date) })}
            />

            <Select
              value={filters.flow ?? 'all'}
              onValueChange={(value) =>
                patch({ flow: value === 'all' ? undefined : (value as 'in' | 'out') })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {intl.get('all_transactions.flow.all')}
                </SelectItem>
                <SelectItem value="in">
                  {intl.get('all_transactions.flow.in')}
                </SelectItem>
                <SelectItem value="out">
                  {intl.get('all_transactions.flow.out')}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.accountId ? String(filters.accountId) : 'all'}
              onValueChange={(value) =>
                patch({ accountId: value === 'all' ? undefined : Number(value) })
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {intl.get('all_transactions.account.all')}
                </SelectItem>
                {(accounts as any[]).map((account: any) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ListToolbar
            search={filters.search ?? ''}
            onSearchChange={(value) => patch({ search: value || undefined })}
            searchPlaceholder={intl.get('all_transactions.search_placeholder')}
          />

          <DataTable
            columns={isAwaiting ? awaitingColumns : columns}
            data={rows}
            getRowId={isAwaiting ? getUncategorizedRowId : getRowId}
            loading={isAwaiting ? isAwaitingLoading : isLoading}
            emptyState={
              <EmptyState
                title={intl.get(
                  isAwaiting
                    ? 'all_transactions.awaiting.empty.title'
                    : 'all_transactions.empty.title',
                )}
                description={intl.get(
                  isAwaiting
                    ? 'all_transactions.awaiting.empty.description'
                    : 'all_transactions.empty.description',
                )}
              />
            }
          />

          {rows.length > 0 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-text-secondary tabular-nums">
                {intl.get('all_transactions.counter', {
                  shown: rows.length,
                  total: shownTotal,
                })}
              </span>

              {(isAwaiting ? hasAwaitingNextPage : hasNextPage) && (
                <Button
                  variant="secondary"
                  disabled={
                    isAwaiting ? isAwaitingFetchingNext : isFetchingNextPage
                  }
                  onClick={() =>
                    isAwaiting ? fetchAwaitingNextPage() : fetchNextPage()
                  }
                >
                  {intl.get('all_transactions.load_more')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardInsider>
  );
}
