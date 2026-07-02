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
  useARAgingSheetCsvExport,
  useARAgingSheetXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';

import {
  FinancialReportToolbar,
  type ReportNumberFormatValues,
} from '../../v2';
import { useARAgingSummaryContext } from '../ARAgingSummaryProvider';
import { withARAgingSummary } from '../withARAgingSummary';
import { withARAgingSummaryActions } from '../withARAgingSummaryActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface ARAgingSummaryToolbarOwnProps {
  numberFormat?: Partial<ReportNumberFormatValues>;
  onNumberFormatSubmit: (values: ReportNumberFormatValues) => void;
}

interface ARAgingSummaryToolbarReduxProps {
  // #withARAgingSummary
  isFilterDrawerOpen: boolean;
  // #withARAgingSummaryActions
  toggleARAgingSummaryFilterDrawer: (toggle?: boolean) => void;
}

interface ARAgingSummaryContextShape {
  refetch: () => void;
  isARAgingFetching: boolean;
  httpQuery: Record<string, unknown>;
}

const useARAgingSummaryContextTyped =
  useARAgingSummaryContext as unknown as () => ARAgingSummaryContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

const useXlsxExportTyped = useARAgingSheetXlsxExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = useARAgingSheetCsvExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const withARAgingSummaryLoose = withARAgingSummary as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withARAgingSummaryActionsLoose =
  withARAgingSummaryActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар отчёта «Дебиторка по срокам» на общем shadcn-тулбаре
 * (FinancialReportToolbar). Действия те же, что в легаси
 * ARAgingSummaryActionsBar: настроить отчёт, формат чисел, пересчитать,
 * печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function ARAgingSummaryToolbarV2Root({
  isFilterDrawerOpen,
  toggleARAgingSummaryFilterDrawer: toggleFilterDrawer,
  openDialog,
  numberFormat,
  onNumberFormatSubmit,
}: ARAgingSummaryToolbarOwnProps &
  ARAgingSummaryToolbarReduxProps &
  WithDialogActionsProps) {
  const { refetch, isARAgingFetching, httpQuery } =
    useARAgingSummaryContextTyped();

  const { mutateAsync: xlsxExport } = useXlsxExportTyped(httpQuery, {});
  const { mutateAsync: csvExport } = useCsvExportTyped(httpQuery, {});

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
    openDialog(DialogsName.ARAgingSummaryPdfPreview);
  };

  return (
    <FinancialReportToolbar
      customizeActive={Boolean(isFilterDrawerOpen)}
      onCustomizeClick={() => toggleFilterDrawer()}
      onRefreshClick={() => refetch()}
      onPrintClick={handlePrintClick}
      onXlsxExportClick={handleXlsxExportClick}
      onCsvExportClick={handleCsvExportClick}
      numberFormat={numberFormat ?? {}}
      onNumberFormatSubmit={onNumberFormatSubmit}
      numberFormatDisabled={isARAgingFetching}
    />
  );
}

export const ARAgingSummaryToolbarV2 = compose(
  withARAgingSummaryActionsLoose,
  withARAgingSummaryLoose(({ ARAgingSummaryFilterDrawer }) => ({
    isFilterDrawerOpen: ARAgingSummaryFilterDrawer,
  })),
  withDialogActions,
)(ARAgingSummaryToolbarV2Root) as React.ComponentType<ARAgingSummaryToolbarOwnProps>;
