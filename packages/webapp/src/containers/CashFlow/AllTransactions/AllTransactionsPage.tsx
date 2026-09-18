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
  type AllTransactionsFilters,
} from '@/hooks/query/cashflowAccounts';
import { useCashflowAccounts } from '@/hooks/query';
import { useAllTransactionsColumns } from './useAllTransactionsColumns';
import {
  defaultPeriod,
  filtersFromSearch,
  searchFromFilters,
} from './allTransactionsFilters';

/** Ключ строки: у операций нет своего номера, сервер различает их парой ссылок. */
const getRowId = (row: any) => `${row.reference_type}-${row.reference_id}`;

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
  const filters = React.useMemo<AllTransactionsFilters>(() => {
    const fromUrl = filtersFromSearch(location.search);

    return fromUrl.fromDate || fromUrl.toDate
      ? fromUrl
      : { ...defaultPeriod(), ...fromUrl };
  }, [location.search]);

  const setFilters = React.useCallback(
    (next: AllTransactionsFilters) => {
      history.replace({
        pathname: location.pathname,
        search: searchFromFilters(next),
      });
    },
    [history, location.pathname],
  );

  const patch = React.useCallback(
    (part: Partial<AllTransactionsFilters>) =>
      setFilters({ ...filters, ...part }),
    [filters, setFilters],
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isSuccess,
  } = useAllTransactionsInfinity(filters);

  const { data: accounts = [] } = useCashflowAccounts();

  const transactions = React.useMemo(
    () => (isSuccess ? flatten(map((data as any)?.pages, (p: any) => p.transactions)) : []),
    [data, isSuccess],
  );
  const total = (data as any)?.pages?.[0]?.pagination?.total ?? 0;
  const columns = useAllTransactionsColumns();

  return (
    <DashboardInsider name={'all-transactions'}>
      <div className="bigfin-ui min-h-full bg-background p-4 sm:p-6">
        <div className="mx-auto flex max-w-[1400px] flex-col">
          <PageHeader title={intl.get('all_transactions.title')} />

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
            columns={columns}
            data={transactions}
            getRowId={getRowId}
            loading={isLoading}
            emptyState={
              <EmptyState
                title={intl.get('all_transactions.empty.title')}
                description={intl.get('all_transactions.empty.description')}
              />
            }
          />

          {transactions.length > 0 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-text-secondary tabular-nums">
                {intl.get('all_transactions.counter', {
                  shown: transactions.length,
                  total,
                })}
              </span>

              {hasNextPage && (
                <Button
                  variant="secondary"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
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
