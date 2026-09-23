import React from 'react';
import intl from 'react-intl-universal';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';

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
  useManagerialPnlTable,
  useManagerialPnlCsvExport,
  useManagerialPnlXlsxExport,
} from '@/hooks/query/FinancialReports';

import { ReportPeriodBar } from '../v2';
import { ReportScopeNote } from '../ReportScopeNote';
import ReportDrillDownPanel, { DrillDownTarget } from '../ReportDrillDownPanel';
import {
  columnBounds,
  isPeriodTooWide,
  matrixColumns,
  skeletonColumnsCount,
} from '../CashFlowArticles/cashFlowArticlesMatrix';
import {
  ManagerialPnlQuery,
  PNL_GROUPINGS,
  PnlGrouping,
  pnlQueryFromSearch,
  pnlRows,
  pnlSearchFromQuery,
} from './managerialPnlRows';
import { hasWaterfall, pnlWaterfall } from './pnlWaterfall';
import { PnlWaterfallChart } from './PnlWaterfallChart';

/**
 * Нет права на управленческий ОПиУ: у ролей, заведённых до его появления,
 * этого права ещё нет. «Повторить» тут не поможет — нужен совет.
 */
const isForbidden = (error: unknown): boolean =>
  (error as any)?.response?.status === 403;

interface LegalEntityOption {
  id: number;
  name: string;
}

/**
 * Управленческий ОПиУ (FT-010 ТЗ-3): лестница прибыли по ярусам статей —
 * маржинальный доход, валовая прибыль по направлениям и общая,
 * операционная и чистая, с рентабельностью под каждым ярусом.
 *
 * Строится от яруса статьи (`pl_type`), а не от вида счёта: собственник
 * настраивает ярус в карточке статьи, а не в плане счетов.
 */
export default function ManagerialPnl() {
  const location = useLocation();
  const history = useHistory();
  const apiRequest = useApiRequest();

  const query = React.useMemo(
    () => pnlQueryFromSearch(location.search),
    [location.search],
  );
  const setQuery = (next: Partial<ManagerialPnlQuery>) =>
    history.replace({
      pathname: location.pathname,
      search: pnlSearchFromQuery(location.search, { ...query, ...next }),
    });

  const [toggles, setToggles] = React.useState(() => ({
    showPercent: getDisplayPreferences().showPercent,
    showEmptyRows: getDisplayPreferences().showEmptyRows,
  }));
  const changeToggle = (key: 'showPercent' | 'showEmptyRows', value: boolean) => {
    setToggles((current) => ({ ...current, [key]: value }));
    setDisplayPreferences({ [key]: value });
    (apiRequest as any)
      .put('settings/display-preferences', { [key]: value })
      .catch(() => undefined);
  };

  const serverQuery = React.useMemo(
    () => ({ ...query, showEmpty: toggles.showEmptyRows }),
    [query, toggles.showEmptyRows],
  );
  const { data, isLoading, isFetching, isError, error, refetch } =
    useManagerialPnlTable(serverQuery, { keepPreviousData: true }) as any;
  const { data: legalEntities } = useLegalEntities() as {
    data?: LegalEntityOption[];
  };
  const { open: exportCsv } = useManagerialPnlCsvExport(serverQuery) as any;
  const { open: exportXlsx } = useManagerialPnlXlsxExport(serverQuery) as any;

  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';
  const serverColumns = data?.table?.columns ?? [];
  const serverRows = data?.table?.rows ?? [];

  const columns = React.useMemo(
    () => {
      const list = matrixColumns(serverColumns, query.dateGroup, locale);
      if (list[0]) list[0] = { ...list[0], label: intl.get('managerial_pnl.column.name') };
      return list;
    },
    [serverColumns, query.dateGroup, locale],
  );
  const { rows, drills } = React.useMemo(
    () =>
      pnlRows(serverRows, formatOrganizationMoney, {
        showPercent: toggles.showPercent,
        locale,
      }),
    [serverRows, toggles.showPercent, locale],
  );
  const bounds = React.useMemo(
    () => columnBounds(serverColumns, query),
    [serverColumns, query],
  );

  // Раскрытие ячейки до операций: за период кликнутой колонки, с отбором и
  // методом учёта отчёта — итог панели обязан совпасть с ячейкой.
  const [drillTarget, setDrillTarget] = React.useState<DrillDownTarget | null>(null);
  // По деньгам выручка счёта, оплаченного позже, «достраивается» по факту
  // оплаты — в журнале таких строк нет, и панель операций не сошлась бы с
  // ячейкой. Лучше не раскрывать, чем показать неверную сумму.
  const canDrillDownCell = (row: ReportTableRow, column: ReportTableColumn) =>
    query.basis !== 'cash' &&
    Boolean(bounds[column.key]) &&
    drills.has(String(row.id));
  const onCellClick = (row: ReportTableRow, column: ReportTableColumn) => {
    const drill = drills.get(String(row.id));
    const period = bounds[column.key];
    if (!drill || !period) return;
    setDrillTarget({
      plType: drill.plType,
      articleId: drill.articleId,
      projectsIds: drill.projectsIds,
      title: row.cells[0]?.value,
      fromDate: period.fromDate,
      toDate: period.toDate,
      legalEntityIds: query.legalEntityIds,
      basis: query.basis,
      reportFrom: query.fromDate,
      reportTo: query.toDate,
    });
  };

  // Водопад (FT-015) — из последней колонки таблицы: это «Итого», а при
  // одной колонке — она сама. Второго запроса нет.
  const waterfall = React.useMemo(() => {
    const values = new Map<string, number>();
    serverRows.forEach((row: any) => {
      const last = row.cells[row.cells.length - 1];
      values.set(row.id, Number(last?.value) || 0);
    });
    return pnlWaterfall((id) => values.get(id) ?? 0);
  }, [serverRows]);

  const revenueRow = serverRows.find((row: any) => row.id === 'revenue');
  const hasMovement = serverRows.some((row: any) =>
    ['PL_GROUP', 'UNASSIGNED'].includes((row.row_types ?? row.rowTypes ?? [])[0]) &&
    row.cells.slice(1).some((cell: any) => Number(cell.value) !== 0),
  );
  const screenState = pickScreenState({
    isLoading,
    isError,
    isEmpty: !hasMovement && Boolean(revenueRow || serverRows.length === 0),
  });
  const showEntityPicker = (legalEntities?.length ?? 0) > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-[70ch] text-sm text-text-secondary">
          {intl.get('managerial_pnl.page_hint')}
        </p>
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

      <ReportPeriodBar
        range={query}
        onRangeChange={(range) => setQuery(range)}
        scale={query.dateGroup}
        onScaleChange={(dateGroup) => setQuery({ dateGroup })}
        basis={query.basis}
        onBasisChange={(basis) => setQuery({ basis })}
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
                <option value="">{intl.get('cash_flow_articles.legal_entity.all')}</option>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={query.group ?? 'articles'}
          onValueChange={(group) => setQuery({ group: group as PnlGrouping })}
        >
          <TabsList className="flex-wrap">
            {PNL_GROUPINGS.map((group) => (
              <TabsTrigger key={group} value={group}>
                {intl.get(`managerial_pnl.group.${group}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <Checkbox
              checked={toggles.showPercent}
              onCheckedChange={(checked: boolean) =>
                changeToggle('showPercent', Boolean(checked))
              }
            />
            {intl.get('managerial_pnl.toggle.percent')}
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <Checkbox
              checked={toggles.showEmptyRows}
              onCheckedChange={(checked: boolean) =>
                changeToggle('showEmptyRows', Boolean(checked))
              }
            />
            {intl.get('cash_flow_articles.toggle.empty')}
          </label>
        </div>
      </div>

      {screenState === 'loading' ? (
        <div className="flex flex-col gap-2 rounded-default border border-border p-6">
          {Array.from({ length: 8 }, (_, row) => (
            <div key={row} className="flex gap-3">
              <Skeleton className="h-6 w-56 shrink-0" />
              {Array.from({ length: skeletonColumnsCount(query) }, (__, column) => (
                <Skeleton key={column} className="h-6 flex-1" />
              ))}
            </div>
          ))}
        </div>
      ) : screenState === 'error' ? (
        <ScreenError
          message={
            isPeriodTooWide(error)
              ? intl.get('cash_flow_articles.error.too_wide')
              : isForbidden(error)
                ? intl.get('managerial_pnl.forbidden')
                : intl.get('managerial_pnl.error')
          }
          onRetry={
            isPeriodTooWide(error) || isForbidden(error) ? undefined : () => refetch()
          }
        />
      ) : screenState === 'empty' ? (
        <div className="flex flex-col items-start gap-2 rounded-default border border-border p-6">
          <p className="font-medium">{intl.get('managerial_pnl.empty')}</p>
          <Link
            to="/management-articles"
            className="text-sm font-medium underline underline-offset-2"
          >
            {intl.get('managerial_pnl.empty_action')}
          </Link>
        </div>
      ) : (
        <>
        {hasWaterfall(waterfall) && <PnlWaterfallChart steps={waterfall} />}
        <ReportSheet
          sheetType={intl.get('managerial_pnl.title')}
          dateText={data?.meta?.formatted_date_range}
          basis={query.basis}
          className={isFetching ? 'opacity-60 transition-opacity' : undefined}
        >
          <ReportScopeNote scope={data?.meta?.legal_entity_scope} />
          <ReportTable
            columns={columns}
            rows={rows}
            defaultExpandedDepth={1}
            hideValuesWhenExpanded={false}
            isFinalRow={(row) => row.id === 'np'}
            onCellClick={onCellClick}
            canDrillDownCell={canDrillDownCell}
            stickyHeader
            stickyFirstColumn
            maxBodyHeight={680}
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
