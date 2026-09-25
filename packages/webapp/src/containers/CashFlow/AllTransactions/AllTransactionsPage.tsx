import React from 'react';
import intl from 'react-intl-universal';
import { useHistory, useLocation } from 'react-router-dom';
import { flatten, map } from 'lodash';

import { DashboardInsider } from '@/components';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Columns3, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useAddActions } from '@/components/Dashboard/addActions';
import { DataTable } from '@/components/ui/data-table';
import { TransactionMobileRow } from './TransactionMobileRow';
import { signedAmount } from './amountSign';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { presetRange } from '@/components/ui/date-range';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { MoneyField } from '@/components/ui/money-field';
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
import { useDialogActions, useDrawerActions, useFeatureCan } from '@/hooks/state';
import { Features } from '@/constants';
import { useDeals } from '@/hooks/query/deals';
import { useManagementArticles } from '@/hooks/query/managementArticles';
import { useTransactionTags } from '@/hooks/query/transactionActions';
import { handleCashFlowTransactionType } from '../AccountTransactions/utils';
import { RegistryRowMenu, useRegistryRowActions } from './RegistryRowActions';
import { RegistryTypeChips, SavedFiltersMenu } from './RegistryQuickFilters';
import { BulkTransactionsDialog } from './BulkTransactionsDialog';
import { DialogsName } from '@/constants/dialogs';
import { useCanExport } from '@/hooks/utils/useAbilityContext';
import { useAllTransactionsColumns } from './useAllTransactionsColumns';
import { useUncategorizedColumns } from './useUncategorizedColumns';
import { BulkActionsBar } from './BulkActionsBar';
import { AccrualBulkBar } from './AccrualBulkBar';
import {
  DEFAULT_REGISTRY_COLUMNS,
  OPTIONAL_COLUMNS,
  RegistryColumnsState,
  toggleRegistryColumn,
  visibleRegistryColumns,
} from './registryColumns';
import {
  countSheetFilters,
  defaultPeriod,
  filtersFromSearch,
  resetSheetFilters,
  searchFromFilters,
  serverFilters,
  type ScreenFilters,
} from './allTransactionsFilters';
import { TransactionsSummaryBar } from './TransactionsSummaryBar';

/** Ключ строки: у операций нет своего номера, сервер различает их парой ссылок. */
const getRowId = (row: any) => `${row.reference_type}-${row.reference_id}`;

/** У строк выписки свой номер есть. */
const getUncategorizedRowId = (row: any) => String(row.id);

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
  const { openDialog } = useDialogActions();
  // Выгрузка таблицей — отдельное право (FT-082 ТЗ-3): без него сервер
  // ответит 403, поэтому кнопку «Экспорт» не показываем.
  const canExport = useCanExport();
  const { openDrawer } = useDrawerActions();
  const { featureCan } = useFeatureCan();
  // Направления и сделки — одна таблица, и обе живут за одним флагом.
  const projectsEnabled = !!featureCan(Features.Projects);
  const { data: projects = [] } = useDeals({}, { enabled: projectsEnabled });
  const { data: articles = [] } = useManagementArticles();
  const { data: tags = [] } = useTransactionTags();
  const rowActions = useRegistryRowActions();
  const addActions = useAddActions();
  // «Несколько операций» (FT-024 ТЗ-3).
  const [bulkOpen, setBulkOpen] = React.useState(false);

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

  // СОСТАВ КОЛОНОК (T-34 ТЗ-2). «Дата» и «Сумма» не снимаются: список
  // операций без них перестаёт быть списком операций.
  const [columnsVisible, setColumnsVisible] =
    React.useState<RegistryColumnsState>(DEFAULT_REGISTRY_COLUMNS);

  const allColumns = useAllTransactionsColumns();
  const columns = React.useMemo(
    () => [
      ...visibleRegistryColumns(allColumns as any[], columnsVisible),
      // Меню операции (FT-022 ТЗ-3): девять действий, недоступное —
      // с объяснением. Колонку нельзя снять: без неё действия не найти.
      {
        id: 'actions',
        Header: '',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <RegistryRowMenu row={row.original} projectsEnabled={projectsEnabled} onAction={rowActions.run} />
        ),
      },
    ],
    [allColumns, columnsVisible, projectsEnabled, rowActions.run],
  );
  const awaitingColumns = useUncategorizedColumns(chartAccounts as any[]);

  // Что показываем сейчас — обычный список или «ждут разноски».
  const rows = isAwaiting ? awaiting : transactions;
  const shownTotal = isAwaiting ? awaitingTotal : total;

  // Выделение строк: в режиме разноски — строки выписки (разнести,
  // исключить); в обычном списке — проведённые операции (месяц начисления,
  // FT-013 ТЗ-3).
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Сменили режим или отборы — прежнее выделение больше не про эти строки.
    setSelectedIds([]);
  }, [isAwaiting, location.search]);

  const selectedRows = React.useMemo(
    () =>
      isAwaiting
        ? awaiting.filter((row: any) => selectedIds.includes(String(row.id)))
        : (transactions as any[]).filter((row: any) =>
            selectedIds.includes(getRowId(row)),
          ),
    [isAwaiting, awaiting, transactions, selectedIds],
  );

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
            /* Реестр вложен в «Кассы и банковские счета», и ключ справки из
               адреса не выводится — поэтому назван явно (FIN-025). */
            helpTopic="all_transactions"
            // ОДНА ГЛАВНАЯ КНОПКА — «Добавить» (UI-048-6, P7). «Несколько
            // операций», «Экспорт» и загрузка выписки — второстепенные, в
            // «⋯»: раньше рядом с заголовком стояли три равные кнопки.
            action={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-1.5">
                    <Plus className="h-4 w-4" aria-hidden />
                    {intl.get('topbar.add')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {addActions
                    .filter((item) => item.kind === 'money')
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.id} onClick={item.run}>
                          <Icon className="mr-2 h-4 w-4 text-text-secondary" aria-hidden />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            }
            more={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={intl.get('all_transactions.more')}>
                    <MoreHorizontal className="h-5 w-5" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem onClick={() => setBulkOpen(true)}>
                    {intl.get('all_transactions.bulk.open')}
                  </DropdownMenuItem>
                  {/*
                    Загрузка выписки всегда идёт в конкретный счёт — так устроен
                    разбор файла. Поэтому пункт появляется, когда счёт выбран
                    отбором; иначе вести его некуда (этап 3 ТЗ, шаг 3.7).
                  */}
                  {filters.accountId && (
                    <DropdownMenuItem
                      onClick={() =>
                        history.push(`/cashflow-accounts/${filters.accountId}/import`)
                      }
                    >
                      {intl.get('all_transactions.import_statement')}
                    </DropdownMenuItem>
                  )}
                  {canExport && (
                    <DropdownMenuItem
                      onClick={() =>
                        openDialog(DialogsName.Export, { resource: 'bank_transaction' })
                      }
                    >
                      {intl.get('export')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />

          {/*
            Полоса состояния из п. 3.1 ТЗ: сколько операций ждёт статьи и
            вход в разноску одним нажатием. Показываем только когда есть что
            разносить — пустая полоса ничего не сообщает.
          */}
          {awaitingTotal > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-control border border-border bg-surface-elevated px-3 py-2">
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

          {/*
            СТРОКА КОНТЕКСТА (FIN-005 ТЗ-2).

            Человек пришёл сюда из отчёта, щёлкнув «Открыть в Операциях».
            Без этой строки список выглядит как весь реестр, просто почему-то
            короткий: отбор по статье не виден ни в одном поле — он живёт в
            адресе. Крестик снимает ТОЛЬКО то, что пришло из отчёта.
          */}
          {filters.articleId && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-control border border-border bg-surface-elevated px-3 py-2">
              <span className="text-sm text-text-primary">
                {intl.get('all_transactions.from_report', {
                  article: `#${filters.articleId}`,
                  from: filters.fromDate ?? '',
                  to: filters.toDate ?? '',
                })}
              </span>
              <Button
                variant="secondary"
                onClick={() => patch({ articleId: undefined })}
              >
                {intl.get('all_transactions.reset_report_filter')}
              </Button>
            </div>
          )}

          {/* СТРОКА ФИЛЬТРОВ — ОДНА (UI-048-1, R12). Было четыре строки на
              ноутбуке и весь первый экран на телефоне (O7): в строке теперь
              период, тип, поиск и «Фильтры (N)»; статьи, направления, метки,
              состояние, суммы и счёт — в шторке; колонки — в меню «Вид». */}
          <FilterBar
            className="mb-3"
            activeCount={countSheetFilters(filters)}
            onReset={() => setFilters(resetSheetFilters(filters))}
            filters={
              <>
                {/* Быстрые фильтры — тоже отборы, их место в шторке. */}
                <SavedFiltersMenu filters={filters} onApply={setFilters} />
          {/* Статья учёта: раньше приходила только из отчёта, теперь её
              можно выбрать и сохранить в быстрый фильтр (FT-021). */}
          <Select
            value={filters.articleId ? String(filters.articleId) : 'all'}
            onValueChange={(value) => patch({ articleId: value === 'all' ? undefined : Number(value) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{intl.get('all_transactions.filter.article_all')}</SelectItem>
              {(articles as any[]).map((article: any) => (
                <SelectItem key={article.id} value={String(article.id)}>
                  {article.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {projectsEnabled && (
            <Select
              value={filters.projectId ? String(filters.projectId) : 'all'}
              onValueChange={(value) => patch({ projectId: value === 'all' ? undefined : Number(value) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{intl.get('all_transactions.filter.project_all')}</SelectItem>
                {(projects as any[]).map((project: any) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Метка (FT-025): отбор появляется, когда меток есть хоть одна. */}
          {(tags.length > 0 || filters.tag) && (
            <Select
              value={filters.tag ?? 'all'}
              onValueChange={(value) => patch({ tag: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{intl.get('all_transactions.filter.tag_all')}</SelectItem>
                {[...new Set([...(tags as string[]), ...(filters.tag ? [filters.tag] : [])])].map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/*
            ОТБОР ПО СОСТОЯНИЮ (FIN-003, T-32). Расчёт состояний и бейджи
            существовали порознь и не были соединены ничем: отбирать было
            нечего. Отбирает СЕРВЕР — список разбит на страницы, и
            фильтровать загруженную страницу значило бы показать «ничего
            не найдено» при полной базе просрочки на следующей.
          */}
          <Select
            value={filters.states?.[0] ?? 'all'}
            onValueChange={(value) =>
              patch({ states: value === 'all' ? undefined : [value] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {intl.get('all_transactions.filter.state_all')}
              </SelectItem>
              <SelectItem value="receivable">
                {intl.get('all_transactions.filter.state_receivable')}
              </SelectItem>
              <SelectItem value="payable">
                {intl.get('all_transactions.filter.state_payable')}
              </SelectItem>
              <SelectItem value="overdue">
                {intl.get('all_transactions.filter.state_overdue')}
              </SelectItem>
            </SelectContent>
          </Select>

          {/*
            Суммы вводит поле продукта, а не системное числовое поле
            браузера: то выбрасывает запятую, и «1000,50» молча становится
            «100050» (сторож `systemNumberInputGuard`, карта v37).
          */}
          <MoneyField
            className="w-full"
            placeholder={intl.get('all_transactions.amount_from')}
            value={filters.minAmount ?? ''}
            onChange={(value) => patch({ minAmount: value })}
          />
          <MoneyField
            className="w-full"
            placeholder={intl.get('all_transactions.amount_to')}
            value={filters.maxAmount ?? ''}
            onChange={(value) => patch({ maxAmount: value })}
          />

          <Select
            value={filters.accountId ? String(filters.accountId) : 'all'}
            onValueChange={(value) =>
              patch({ accountId: value === 'all' ? undefined : Number(value) })
            }
          >
            <SelectTrigger className="w-full">
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
              </>
            }
            trailing={
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-1.5">
                      <Columns3 className="h-4 w-4" aria-hidden />
                      {intl.get('all_transactions.view')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{intl.get('all_transactions.columns.label')}</DropdownMenuLabel>
                    {/* СОСТАВ КОЛОНОК (T-34). Обязательных здесь нет вовсе: их
                        нельзя снять, и показывать заблокированную галочку
                        значит предлагать то, чего сделать нельзя. */}
                    {OPTIONAL_COLUMNS.map((columnId) => (
                      <DropdownMenuCheckboxItem
                        key={columnId}
                        checked={columnsVisible[columnId] !== false}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={() =>
                          setColumnsVisible((current) => toggleRegistryColumn(current, columnId))
                        }
                      >
                        {intl.get(`all_transactions.column.${columnId}`)}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          >
            {/* Период — одним полем «1–30 сент. 2026 г.» со стрелками
                ‹ › (UI-044-2 ТЗ-4). */}
            <DateRangePicker
              value={
                filters.fromDate && filters.toDate
                  ? { from: filters.fromDate, to: filters.toDate }
                  : presetRange('this_month', new Date().toISOString().slice(0, 10))
              }
              onChange={(range) => patch({ fromDate: range.from, toDate: range.to })}
            />
            {/* Ряд типов с «Без статьи (N)» (FT-020 ТЗ-3). */}
            <RegistryTypeChips filters={filters} patch={patch} uncategorizedCount={awaitingTotal} />
            <div className="relative w-full min-w-40 sm:w-48">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
              <Input
                value={filters.search ?? ''}
                placeholder={intl.get('all_transactions.search_placeholder')}
                aria-label={intl.get('all_transactions.search_placeholder')}
                onChange={(event) => patch({ search: event.target.value || undefined })}
                className="pl-8"
              />
            </div>
          </FilterBar>

          {/* Массовые действия — плавающая панель снизу, пока строки
              выбраны (UI-048-4): раньше панель подменяла собой поиск, и
              строка фильтров прыгала. */}
          {selectedRows.length > 0 && (
            <div className="bigfin-ui fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6">
              <div className="flex max-w-full flex-wrap items-center gap-3 rounded-default border border-border bg-surface px-4 py-2 shadow-elev-2">
                <span className="text-subhead font-medium tabular-nums text-text-secondary">
                  {intl.get('all_transactions.selected', { count: selectedRows.length })}
                </span>
                {isAwaiting ? (
                  <BulkActionsBar
                    rows={selectedRows}
                    accounts={chartAccounts as any[]}
                    onDone={() => setSelectedIds([])}
                  />
                ) : (
                  <AccrualBulkBar rows={selectedRows} onDone={() => setSelectedIds([])} />
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  {intl.get('all_transactions.clear_selection')}
                </Button>
              </div>
            </div>
          )}

          <DataTable
            columns={isAwaiting ? awaitingColumns : columns}
            data={rows}
            getRowId={isAwaiting ? getUncategorizedRowId : getRowId}
            loading={isAwaiting ? isAwaitingLoading : isLoading}
            enableSelection
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            // Щелчок по строке открывает карточку операции (FT-022): там
            // части, история и действия документа.
            onRowClick={
              isAwaiting ? undefined : (row: any) => handleCashFlowTransactionType(row, openDrawer)
            }
            // На телефоне строка выкладывается блоком, а не столбцами:
            // таблица из шести колонок на экране в 390 точек прокручивается
            // вбок, и человек не видит строку целиком. Это главный
            // ежедневный экран, и смотрят его чаще всего с телефона.
            renderMobileRow={(row: any) =>
              isAwaiting ? (
                <TransactionMobileRow
                  formattedDate={row.formatted_date}
                  payee={row.payee}
                  description={row.description}
                  formattedAmount={signedAmount(
                    Number(row.deposit) > 0
                      ? row.formatted_deposit_amount
                      : row.formatted_withdrawal_amount,
                    Number(row.deposit) > 0,
                  )}
                  isDeposit={Number(row.deposit) > 0}
                />
              ) : (
                <TransactionMobileRow
                  formattedDate={row.formatted_date}
                  payee={row.contact_name}
                  description={row.note}
                  formattedAmount={signedAmount(
                    Number(row.deposit) > 0
                      ? row.formatted_deposit
                      : row.formatted_withdrawal,
                    Number(row.deposit) > 0,
                  )}
                  isDeposit={Number(row.deposit) > 0}
                />
              )
            }
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

        {/*
          ИТОГИ ВНИЗУ (FIN-008 ТЗ-2). «Сколько и на сколько» под тем же
          фильтром, что и список, — без единого щелчка и без выгрузки в
          Excel. Строка закреплена: прокрутив список, человек не теряет
          ответ из виду.
        */}
        <TransactionsSummaryBar filters={query} />
        {rowActions.dialogs}
        {bulkOpen && (
          <BulkTransactionsDialog defaultAccountId={filters.accountId} onClose={() => setBulkOpen(false)} />
        )}
      </div>
    </DashboardInsider>
  );
}
