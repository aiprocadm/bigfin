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
  useCustomerBalanceSummaryCsvExport,
  useCustomerBalanceSummaryXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';

import {
  FinancialReportToolbar,
  type ReportNumberFormatValues,
} from '../../v2';
import { useCustomersBalanceSummaryContext } from '../CustomersBalanceSummaryProvider';
import { withCustomersBalanceSummary } from '../withCustomersBalanceSummary';
import { withCustomersBalanceSummaryActions } from '../withCustomersBalanceSummaryActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface CustomersBalanceToolbarOwnProps {
  numberFormat?: Partial<ReportNumberFormatValues>;
  onNumberFormatSubmit: (values: ReportNumberFormatValues) => void;
}

interface CustomersBalanceToolbarReduxProps {
  // #withCustomersBalanceSummary
  isFilterDrawerOpen: boolean;
  // #withCustomersBalanceSummaryActions
  toggleCustomerBalanceFilterDrawer: (toggle?: boolean) => void;
}

interface CustomersBalanceContextShape {
  refetch: () => void;
  isCustomersBalanceLoading: boolean;
  httpQuery: Record<string, unknown>;
}

const useCustomersBalanceContextTyped =
  useCustomersBalanceSummaryContext as unknown as () => CustomersBalanceContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

const useXlsxExportTyped = useCustomerBalanceSummaryXlsxExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = useCustomerBalanceSummaryCsvExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const withCustomersBalanceSummaryLoose =
  withCustomersBalanceSummary as unknown as (
    mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
  ) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withCustomersBalanceSummaryActionsLoose =
  withCustomersBalanceSummaryActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар отчёта «Сальдо по клиентам» на общем shadcn-тулбаре
 * (FinancialReportToolbar). Действия те же, что в легаси
 * CustomersBalanceSummaryActionsBar: настроить отчёт, формат чисел,
 * пересчитать, печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function CustomersBalanceSummaryToolbarV2Root({
  isFilterDrawerOpen,
  toggleCustomerBalanceFilterDrawer: toggleFilterDrawer,
  openDialog,
  numberFormat,
  onNumberFormatSubmit,
}: CustomersBalanceToolbarOwnProps &
  CustomersBalanceToolbarReduxProps &
  WithDialogActionsProps) {
  const { refetch, isCustomersBalanceLoading, httpQuery } =
    useCustomersBalanceContextTyped();

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
    openDialog(DialogsName.CustomerBalanceSummaryPdfPreview);
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
      numberFormatDisabled={isCustomersBalanceLoading}
    />
  );
}

export const CustomersBalanceSummaryToolbarV2 = compose(
  withCustomersBalanceSummaryLoose(({ customersBalanceDrawerFilter }) => ({
    isFilterDrawerOpen: customersBalanceDrawerFilter,
  })),
  withCustomersBalanceSummaryActionsLoose,
  withDialogActions,
)(
  CustomersBalanceSummaryToolbarV2Root,
) as React.ComponentType<CustomersBalanceToolbarOwnProps>;
