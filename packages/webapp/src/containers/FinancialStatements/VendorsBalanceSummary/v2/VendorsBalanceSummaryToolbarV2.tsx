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
  useVendorBalanceSummaryCsvExport,
  useVendorBalanceSummaryXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';

import {
  FinancialReportToolbar,
  type ReportNumberFormatValues,
} from '../../v2';
import { useVendorsBalanceSummaryContext } from '../VendorsBalanceSummaryProvider';
import { withVendorsBalanceSummary } from '../withVendorsBalanceSummary';
import { withVendorsBalanceSummaryActions } from '../withVendorsBalanceSummaryActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface VendorsBalanceToolbarOwnProps {
  numberFormat?: Partial<ReportNumberFormatValues>;
  onNumberFormatSubmit: (values: ReportNumberFormatValues) => void;
}

interface VendorsBalanceToolbarReduxProps {
  // #withVendorsBalanceSummary
  isFilterDrawerOpen: boolean;
  // #withVendorsBalanceSummaryActions
  toggleVendorSummaryFilterDrawer: (toggle?: boolean) => void;
}

interface VendorsBalanceContextShape {
  refetch: () => void;
  isVendorsBalanceLoading: boolean;
}

const useVendorsBalanceContextTyped =
  useVendorsBalanceSummaryContext as unknown as () => VendorsBalanceContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

// Как в легаси: экспорт-хуки этого отчёта принимают только props (без query).
const useXlsxExportTyped = useVendorBalanceSummaryXlsxExport as unknown as (
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = useVendorBalanceSummaryCsvExport as unknown as (
  props: Record<string, unknown>,
) => ExportMutation;

const withVendorsBalanceSummaryLoose =
  withVendorsBalanceSummary as unknown as (
    mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
  ) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withVendorsBalanceSummaryActionsLoose =
  withVendorsBalanceSummaryActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар отчёта «Сальдо по поставщикам» на общем shadcn-тулбаре
 * (FinancialReportToolbar). Действия те же, что в легаси
 * VendorsBalanceSummaryActionsBar: настроить отчёт, формат чисел,
 * пересчитать, печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function VendorsBalanceSummaryToolbarV2Root({
  isFilterDrawerOpen,
  toggleVendorSummaryFilterDrawer: toggleFilterDrawer,
  openDialog,
  numberFormat,
  onNumberFormatSubmit,
}: VendorsBalanceToolbarOwnProps &
  VendorsBalanceToolbarReduxProps &
  WithDialogActionsProps) {
  const { refetch, isVendorsBalanceLoading } = useVendorsBalanceContextTyped();

  const { mutateAsync: xlsxExport } = useXlsxExportTyped({});
  const { mutateAsync: csvExport } = useCsvExportTyped({});

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
    openDialog(DialogsName.VendorBalancePdfPreview);
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
      numberFormatDisabled={isVendorsBalanceLoading}
    />
  );
}

export const VendorsBalanceSummaryToolbarV2 = compose(
  withVendorsBalanceSummaryLoose(({ VendorsSummaryFilterDrawer }) => ({
    isFilterDrawerOpen: VendorsSummaryFilterDrawer,
  })),
  withVendorsBalanceSummaryActionsLoose,
  withDialogActions,
)(
  VendorsBalanceSummaryToolbarV2Root,
) as React.ComponentType<VendorsBalanceToolbarOwnProps>;
