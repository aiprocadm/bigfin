import * as React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { DialogsName } from '@/constants/dialogs';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import {
  useAPAgingSheetCsvExport,
  useAPAgingSheetXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';
import { useCanExport } from '@/hooks/utils/useAbilityContext';

import {
  FinancialReportToolbar,
  type ReportNumberFormatValues,
} from '../../v2';
import { useAPAgingSummaryContext } from '../APAgingSummaryProvider';
import { withAPAgingSummary } from '../withAPAgingSummary';
import { withAPAgingSummaryActions } from '../withAPAgingSummaryActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface APAgingSummaryToolbarOwnProps {
  numberFormat?: Partial<ReportNumberFormatValues>;
  onNumberFormatSubmit: (values: ReportNumberFormatValues) => void;
}

interface APAgingSummaryToolbarReduxProps {
  // #withAPAgingSummary
  isFilterDrawerOpen: boolean;
  // #withAPAgingSummaryActions
  toggleAPAgingSummaryFilterDrawer: (toggle?: boolean) => void;
}

interface APAgingSummaryContextShape {
  refetch: () => void;
  isAPAgingFetching: boolean;
  httpQuery: Record<string, unknown>;
}

const useAPAgingSummaryContextTyped =
  useAPAgingSummaryContext as unknown as () => APAgingSummaryContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

const useXlsxExportTyped = useAPAgingSheetXlsxExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = useAPAgingSheetCsvExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const withAPAgingSummaryLoose = withAPAgingSummary as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withAPAgingSummaryActionsLoose =
  withAPAgingSummaryActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар отчёта «Кредиторка по срокам» на общем shadcn-тулбаре
 * (FinancialReportToolbar). Действия те же, что в легаси
 * APAgingSummaryActionsBar: настроить отчёт, формат чисел, пересчитать,
 * печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function APAgingSummaryToolbarV2Root({
  isFilterDrawerOpen,
  toggleAPAgingSummaryFilterDrawer: toggleFilterDrawer,
  openDialog,
  numberFormat,
  onNumberFormatSubmit,
}: APAgingSummaryToolbarOwnProps &
  APAgingSummaryToolbarReduxProps &
  WithDialogActionsProps) {
  const { refetch, isAPAgingFetching, httpQuery } =
    useAPAgingSummaryContextTyped();

  const { mutateAsync: xlsxExport } = useXlsxExportTyped(httpQuery, {});
  const { mutateAsync: csvExport } = useCsvExportTyped(httpQuery, {});
  // Выгрузка таблицей — отдельное право (FT-082 ТЗ-3): без него сервер
  // ответит 403, поэтому пункты XLSX/CSV не передаём. Печать (PDF)
  // этим правом не закрыта и остаётся.
  const canExport = useCanExport();

  const notifyExported = () => {
    showToast({
      message: intl.get('report_exported_successfully'),
      intent: Intent.SUCCESS,
    });
  };

  const handleXlsxExportClick = () => {
    xlsxExport().then(notifyExported);
  };
  const handleCsvExportClick = () => {
    csvExport().then(notifyExported);
  };
  // Имя диалога сохранено — открывается легаси PDF-превью.
  const handlePrintClick = () => {
    openDialog(DialogsName.APAgingSummaryPdfPreview);
  };

  return (
    <FinancialReportToolbar
      customizeActive={Boolean(isFilterDrawerOpen)}
      onCustomizeClick={() => toggleFilterDrawer()}
      onRefreshClick={() => refetch()}
      onPrintClick={handlePrintClick}
      onXlsxExportClick={canExport ? handleXlsxExportClick : undefined}
      onCsvExportClick={canExport ? handleCsvExportClick : undefined}
      numberFormat={numberFormat ?? {}}
      onNumberFormatSubmit={onNumberFormatSubmit}
      numberFormatDisabled={isAPAgingFetching}
    />
  );
}

export const APAgingSummaryToolbarV2 = compose(
  withAPAgingSummaryActionsLoose,
  withAPAgingSummaryLoose(({ APAgingSummaryFilterDrawer }) => ({
    isFilterDrawerOpen: APAgingSummaryFilterDrawer,
  })),
  withDialogActions,
)(APAgingSummaryToolbarV2Root) as React.ComponentType<APAgingSummaryToolbarOwnProps>;
