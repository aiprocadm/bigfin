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
  useGeneralLedgerSheetCsvExport,
  useGeneralLedgerSheetXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';

import { FinancialReportToolbar } from '../../v2';
import { useGeneralLedgerContext } from '../GeneralLedgerProvider';
import { withGeneralLedger } from '../withGeneralLedger';
import { withGeneralLedgerActions } from '../withGeneralLedgerActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface GeneralLedgerToolbarReduxProps {
  // #withGeneralLedger
  isFilterDrawerOpen: boolean;
  // #withGeneralLedgerActions
  toggleGeneralLedgerFilterDrawer: (toggle?: boolean) => void;
}

interface GeneralLedgerContextShape {
  sheetRefresh: () => void;
  httpQuery: Record<string, unknown>;
}

const useGeneralLedgerContextTyped =
  useGeneralLedgerContext as unknown as () => GeneralLedgerContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

const useXlsxExportTyped = useGeneralLedgerSheetXlsxExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = useGeneralLedgerSheetCsvExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const withGeneralLedgerLoose = withGeneralLedger as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withGeneralLedgerActionsLoose = withGeneralLedgerActions as unknown as (
  component: React.ComponentType<any>,
) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар Главной книги на общем shadcn-тулбаре (FinancialReportToolbar).
 * Действия те же, что в легаси GeneralLedgerActionsBar: настроить отчёт,
 * пересчитать, печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function GeneralLedgerToolbarV2Root({
  isFilterDrawerOpen,
  toggleGeneralLedgerFilterDrawer: toggleFilterDrawer,
  openDialog,
}: GeneralLedgerToolbarReduxProps & WithDialogActionsProps) {
  const { sheetRefresh, httpQuery } = useGeneralLedgerContextTyped();

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
    openDialog(DialogsName.GeneralLedgerPdfPreview);
  };

  return (
    <FinancialReportToolbar
      customizeActive={Boolean(isFilterDrawerOpen)}
      onCustomizeClick={() => toggleFilterDrawer()}
      onRefreshClick={() => sheetRefresh()}
      onPrintClick={handlePrintClick}
      onXlsxExportClick={handleXlsxExportClick}
      onCsvExportClick={handleCsvExportClick}
    />
  );
}

export const GeneralLedgerToolbarV2 = compose(
  withGeneralLedgerLoose(({ generalLedgerFilterDrawer }) => ({
    isFilterDrawerOpen: generalLedgerFilterDrawer,
  })),
  withGeneralLedgerActionsLoose,
  withDialogActions,
)(GeneralLedgerToolbarV2Root) as React.ComponentType;
