import React from 'react';
import intl from 'react-intl-universal';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Download } from 'lucide-react';

import { ScreenHelp } from '@/components/ui/screen-help';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenError } from '@/components/ui/screen-error';
import { pickScreenState } from '@/components/ui/screen-state';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import useApiRequest from '@/hooks/useRequest';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import {
  getDisplayPreferences,
  setDisplayPreferences,
} from '@/utils/displayPreferences';
import { useLegalEntities } from '@/hooks/query/legalEntities';
import {
  useCashFlowArticlesTable,
  useCashFlowArticlesCsvExport,
  useCashFlowArticlesXlsxExport,
} from '@/hooks/query/FinancialReports';

import { ReportPeriodBar } from '../v2';
import { ReportScopeNote } from '../ReportScopeNote';
import ReportDrillDownPanel, { DrillDownTarget } from '../ReportDrillDownPanel';
import {
  CASHFLOW_GROUPINGS,
  CashFlowArticlesQuery,
  CashFlowGrouping,
  columnBounds,
  drillOfRow,
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

/** Тумблеры отчёта — личные настройки человека (FT-003, FT-005, FT-006). */
type ToggleKey = 'showPercent' | 'showEmptyRows' | 'showTransfers';

const TOGGLES: Array<{ key: ToggleKey; labelKey: string }> = [
  { key: 'showPercent', labelKey: 'cash_flow_articles.toggle.percent' },
  { key: 'showEmptyRows', labelKey: 'cash_flow_articles.toggle.empty' },
  { key: 'showTransfers', labelKey: 'cash_flow_articles.toggle.transfers' },
];

/**
 * Отчёт «Деньги (ДДС по статьям)» — главный денежный отчёт продукта
 * (FIN-013 ТЗ-2), с этапа 30 — матрица «строки × периоды» (FT-001 ТЗ-3), с
 * этапа 31 — шесть группировок строк, доли, раскрытие ячейки (FT-002…006b).
 *
 * ПЕРИОД, МАСШТАБ, ГРУППИРОВКА И ЮРЛИЦО — В АДРЕСЕ. Отчёт пересылают:
 * «посмотри деньги по контрагентам за квартал» должно быть ссылкой.
 *
 * ТУМБЛЕРЫ — ЛИЧНЫЕ. Проценты, пустые строки и переводы — вопрос вкуса
 * одного человека, а не свойство отчёта: они хранятся в его настройках вида
 * и не меняются от чужой ссылки.
 *
 * ПЕРЕКЛЮЧАТЕЛЯ «УЧЁТ» ЗДЕСЬ НЕТ. Движение денег кассово по определению.
 */
export default function CashFlowArticles() {
  const location = useLocation();
  const history = useHistory();
  const apiRequest = useApiRequest();

  const query = React.useMemo(
    () => queryFromSearch(location.search),
    [location.search],
  );
  const setQuery = (next: Partial<CashFlowArticlesQuery>) =>
    history.replace({
      pathname: location.pathname,
      search: searchFromQuery(location.search, { ...query, ...next }),
    });
  // Статья, по ссылке на которую пришли из «Карты статей».
  const highlightArticleId = React.useMemo(
    () => new URLSearchParams(location.search).get('articleId'),
    [location.search],
  );

  const [toggles, setToggles] = React.useState(() => {
    const prefs = getDisplayPreferences();
    return {
      showPercent: prefs.showPercent,
      showEmptyRows: prefs.showEmptyRows,
      showTransfers: prefs.showTransfers,
    };
  });
  const changeToggle = (key: ToggleKey, value: boolean) => {
    setToggles((current) => ({ ...current, [key]: value }));
    setDisplayPreferences({ [key]: value });
    // Сохраняем молча: не сохранилось — тумблер всё равно сработал на
    // экране, а человек пришёл смотреть отчёт, а не читать про сеть.
    (apiRequest as any)
      .put('settings/display-preferences', { [key]: value })
      .catch(() => undefined);
  };

  const serverQuery = React.useMemo(
    () => ({
      ...query,
      showEmpty: toggles.showEmptyRows,
      showTransfers: toggles.showTransfers,
    }),
    [query, toggles.showEmptyRows, toggles.showTransfers],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useCashFlowArticlesTable(serverQuery, { keepPreviousData: true }) as any;
  const { data: legalEntities } = useLegalEntities() as {
    data?: LegalEntityOption[];
  };
  const organization = useSelector(
    (state: any) => state?.settings?.data?.organization,
  );

  const { open: exportCsv } = useCashFlowArticlesCsvExport(serverQuery) as any;
  const { open: exportXlsx } = useCashFlowArticlesXlsxExport(serverQuery) as any;

  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';
  const serverColumns: MatrixServerColumn[] = data?.table?.columns ?? [];
  const serverRows: MatrixServerRow[] = data?.table?.rows ?? [];

  const columns = React.useMemo(
    () =>
      matrixColumns(serverColumns, query.dateGroup, locale, {
        highlightWeekends: organization?.highlightWeekends,
        showWeekdays: organization?.showWeekdays,
      }),
    [serverColumns, query.dateGroup, locale, organization],
  );
  const rows = React.useMemo(
    () =>
      matrixRows(serverRows, formatOrganizationMoney, {
        showPercent: toggles.showPercent,
        locale,
      }),
    [serverRows, toggles.showPercent, locale],
  );
  const series = React.useMemo(
    () => periodChartSeries(columns, serverRows),
    [columns, serverRows],
  );
  const bounds = React.useMemo(
    () => columnBounds(serverColumns, query),
    [serverColumns, query],
  );

  // Раскрытие ячейки до операций (FT-004): границы КЛИКНУТОЙ колонки и
  // отбор отчёта — иначе итог панели не сошёлся бы с ячейкой.
  const [drillTarget, setDrillTarget] = React.useState<DrillDownTarget | null>(
    null,
  );
  const canDrillDownCell = (row: ReportTableRow, column: ReportTableColumn) =>
    Boolean(bounds[column.key]) && drillOfRow(row.id) !== null;
  const onCellClick = (row: ReportTableRow, column: ReportTableColumn) => {
    const drill = drillOfRow(row.id);
    const period = bounds[column.key];
    if (!drill || !period) return;

    setDrillTarget({
      articleId: drill.articleId,
      articleName: row.cells[0]?.value,
      fromDate: period.fromDate,
      toDate: period.toDate,
      legalEntityIds: query.legalEntityIds,
      projectsIds: drill.projectsIds,
      reportFrom: query.fromDate,
      reportTo: query.toDate,
    });
  };

  // Пришли по ссылке «эта статья в отчёте» — показываем её строку.
  const highlightRowId = highlightArticleId
    ? `article-${highlightArticleId}`
    : undefined;
  React.useEffect(() => {
    if (!highlightRowId || rows.length === 0) return;
    document
      .querySelector(`[data-row-id="${highlightRowId}"]`)
      ?.scrollIntoView?.({ block: 'center' });
  }, [highlightRowId, rows]);

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

      {/* Шесть группировок строк (FT-002). Меняются только строки: поток
          и остатки одинаковы на всех вкладках. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={query.group ?? 'articles'}
          onValueChange={(group) =>
            setQuery({ group: group as CashFlowGrouping })
          }
        >
          <TabsList className="flex-wrap">
            {CASHFLOW_GROUPINGS.map((group) => (
              <TabsTrigger key={group} value={group}>
                {intl.get(`cash_flow_articles.group.${group}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-4">
          {TOGGLES.map((toggle) => (
            <label
              key={toggle.key}
              className="flex items-center gap-2 text-sm text-text-secondary"
            >
              <Checkbox
                checked={toggles[toggle.key]}
                onCheckedChange={(checked: boolean) =>
                  changeToggle(toggle.key, Boolean(checked))
                }
              />
              {intl.get(toggle.labelKey)}
            </label>
          ))}
        </div>
      </div>

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
              onCellClick={onCellClick}
              canDrillDownCell={canDrillDownCell}
              highlightRowId={highlightRowId}
              stickyHeader
              stickyFirstColumn
              maxBodyHeight={640}
            />
          </ReportSheet>
        </>
      )}

      <ReportDrillDownPanel
        target={drillTarget}
        onClose={() => setDrillTarget(null)}
      />
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
