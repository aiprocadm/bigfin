import React from 'react';
import intl from 'react-intl-universal';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';

import { ScreenHelp } from '@/components/ui/screen-help';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenError } from '@/components/ui/screen-error';
import { pickScreenState } from '@/components/ui/screen-state';
import { ReportSheet, ReportTable } from '@/components/ui/report-table';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { useLegalEntities } from '@/hooks/query/legalEntities';
import {
  useCashFlowArticlesTable,
  useCashFlowArticlesCsvExport,
  useCashFlowArticlesXlsxExport,
} from '@/hooks/query/FinancialReports';

import { ReportPeriodBar } from '../v2';
import { ReportScopeNote } from '../ReportScopeNote';
import {
  CashFlowArticlesQuery,
  isPeriodTooWide,
  matrixColumns,
  matrixRows,
  MatrixServerColumn,
  MatrixServerRow,
  queryFromSearch,
  searchFromQuery,
  skeletonColumnsCount,
} from './cashFlowArticlesMatrix';
import { hasPeriodMovement, periodChartSeries } from './cashFlowArticlesChart';
import { CashFlowChart } from './CashFlowChart';

interface LegalEntityOption {
  id: number;
  name: string;
}

/**
 * Отчёт «Деньги (ДДС по статьям)» — главный денежный отчёт продукта
 * (FIN-013 ТЗ-2), с этапа 30 — матрицей «статьи × периоды» (FT-001 ТЗ-3).
 *
 * ПОЧЕМУ МАТРИЦА. Отчёт показывал одну сумму за весь период. Ответить «в
 * каком месяце уехала аренда» было нельзя — только двенадцать раз сменить
 * период и выписать цифры на бумажку.
 *
 * ПЕРИОД, МАСШТАБ И ЮРЛИЦО — В АДРЕСЕ. Отчёт пересылают: «посмотри деньги по
 * кварталам» должно быть ссылкой, а не инструкцией.
 *
 * ПЕРЕКЛЮЧАТЕЛЯ «УЧЁТ» ЗДЕСЬ НЕТ. Движение денег кассово по определению, и
 * переключатель, который ничего не меняет, хуже его отсутствия.
 */
export default function CashFlowArticles() {
  const location = useLocation();
  const history = useHistory();
  const query = React.useMemo(
    () => queryFromSearch(location.search),
    [location.search],
  );
  const setQuery = (next: Partial<CashFlowArticlesQuery>) =>
    history.replace({
      pathname: location.pathname,
      search: searchFromQuery(location.search, { ...query, ...next }),
    });

  const { data, isLoading, isFetching, isError, error, refetch } =
    useCashFlowArticlesTable(query, { keepPreviousData: true }) as any;
  const { data: legalEntities } = useLegalEntities() as {
    data?: LegalEntityOption[];
  };

  const { open: exportCsv } = useCashFlowArticlesCsvExport(query) as any;
  const { open: exportXlsx } = useCashFlowArticlesXlsxExport(query) as any;

  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';
  const serverColumns: MatrixServerColumn[] = data?.table?.columns ?? [];
  const serverRows: MatrixServerRow[] = data?.table?.rows ?? [];

  const columns = React.useMemo(
    () => matrixColumns(serverColumns, query.dateGroup, locale),
    [serverColumns, query.dateGroup, locale],
  );
  const rows = React.useMemo(
    () => matrixRows(serverRows, formatOrganizationMoney),
    [serverRows],
  );
  const series = React.useMemo(
    () => periodChartSeries(columns, serverRows),
    [columns, serverRows],
  );

  // Пусто — это когда за период не было ни одного движения, а не когда нет
  // строк: строки «Остаток на начало/конец» есть всегда.
  const isEmpty = !hasPeriodMovement(series) && !hasTransfers(serverRows);
  const screenState = pickScreenState({ isLoading, isError, isEmpty });

  // Выбор юрлица показываем, только когда их больше одного: выбор из одного
  // — не выбор, а лишний вопрос без ответа.
  const showEntityPicker = (legalEntities?.length ?? 0) > 1;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-semibold">
              {intl.get('cash_flow_articles.page_title')}
            </h1>
            {/* Контекстная справка (FIN-025). Экран вложен в «Отчёты», и
                ключ из адреса не выводится — поэтому назван явно. */}
            <ScreenHelp topic="cash_flow_articles" />
          </div>
          <p className="mt-1 max-w-[70ch] text-sm text-text-secondary">
            {intl.get('cash_flow_articles.page_hint')}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="secondary" onClick={() => exportCsv?.()}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => exportXlsx?.()}>
            <Download className="mr-2 h-4 w-4" />
            XLSX
          </Button>
        </div>
      </div>

      {/* Период и масштаб — на странице, одним нажатием (FIN-012). */}
      <ReportPeriodBar
        range={query}
        onRangeChange={(range) => setQuery(range)}
        scale={query.dateGroup}
        onScaleChange={(dateGroup) => setQuery({ dateGroup })}
        extraSlot={
          showEntityPicker ? (
            <label className="flex items-center gap-1 text-xs text-text-secondary">
              {intl.get('cash_flow_articles.legal_entity')}
              <select
                className="border-input bg-background h-8 rounded-control border px-2 text-sm"
                value={query.legalEntityIds?.[0] ?? ''}
                onChange={(event) =>
                  setQuery({
                    legalEntityIds: event.target.value
                      ? [Number(event.target.value)]
                      : undefined,
                  })
                }
              >
                <option value="">
                  {intl.get('cash_flow_articles.legal_entity.all')}
                </option>
                {legalEntities!.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null
        }
      />

      {screenState === 'loading' ? (
        <MatrixSkeleton columns={skeletonColumnsCount(query)} />
      ) : screenState === 'error' ? (
        <ScreenError
          message={
            isPeriodTooWide(error)
              ? intl.get('cash_flow_articles.error.too_wide')
              : intl.get('cash_flow_articles.error')
          }
          onRetry={isPeriodTooWide(error) ? undefined : () => refetch()}
        />
      ) : screenState === 'empty' ? (
        /**
         * Пустой период объясняет себя и ведёт дальше: «ничего нет» без
         * подсказки читается как поломка, а не как ответ.
         */
        <div className="flex flex-col items-start gap-2 rounded-default border border-border p-6">
          <p className="font-medium">{intl.get('cash_flow_articles.empty')}</p>
          <Link
            to="/cashflow-accounts"
            className="text-sm font-medium underline underline-offset-2"
          >
            {intl.get('cash_flow_articles.empty_action')}
          </Link>
        </div>
      ) : (
        <>
          {/* ГРАФИК НАД ТАБЛИЦЕЙ. Числа — из тех же строк, что рисует
              таблица: второго источника нет, и разойтись им не на чем. */}
          {series.length > 1 && <CashFlowChart series={series} />}

          <ReportSheet
            sheetType={intl.get('cash_flow_articles.page_title')}
            dateText={data?.meta?.formatted_date_range}
            className={isFetching ? 'opacity-60 transition-opacity' : undefined}
          >
            {/* Что показано: сводно или по одному юрлицу (FT-008). */}
            <ReportScopeNote scope={data?.meta?.legal_entity_scope} />
            <ReportTable
              columns={columns}
              rows={rows}
              defaultExpandedDepth={2}
              // Итога «ниже группы» в этом отчёте нет: суммы раскрытой
              // группы прятать нельзя — иначе их не видно нигде.
              hideValuesWhenExpanded={false}
              isFinalRow={(row) => row.id === 'closing'}
              stickyHeader
              stickyFirstColumn
              maxBodyHeight={640}
            />
          </ReportSheet>
        </>
      )}
    </div>
  );
}

/** Были ли переводы между своими счетами (движение без потока). */
function hasTransfers(rows: MatrixServerRow[]): boolean {
  const transfers = rows.find((row) => row.id === 'transfers');
  return Boolean(
    transfers?.children?.some((row) =>
      row.cells.slice(1).some((cell) => Number(cell.value) !== 0),
    ),
  );
}

/** Заглушка в форме будущей таблицы: столько колонок, сколько будет. */
function MatrixSkeleton({ columns }: { columns: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-default border border-border p-6">
      {Array.from({ length: 6 }, (_, row) => (
        <div key={row} className="flex gap-3">
          <Skeleton className="h-6 w-48 shrink-0" />
          {Array.from({ length: columns }, (__, column) => (
            <Skeleton key={column} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
