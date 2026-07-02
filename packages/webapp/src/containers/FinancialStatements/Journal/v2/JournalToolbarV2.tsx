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
  useJournalSheetCsvExport,
  useJournalSheetXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';

import { FinancialReportToolbar } from '../../v2';
import { useJournalSheetContext } from '../JournalProvider';
import { withJournal } from '../withJournal';
import { withJournalActions } from '../withJournalActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface JournalToolbarReduxProps {
  // #withJournal
  isFilterDrawerOpen: boolean;
  // #withJournalActions
  toggleJournalSheetFilter: (toggle?: boolean) => void;
}

interface JournalSheetContextShape {
  refetchSheet: () => void;
  httpQuery: Record<string, unknown>;
}

const useJournalSheetContextTyped =
  useJournalSheetContext as unknown as () => JournalSheetContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

const useXlsxExportTyped = useJournalSheetXlsxExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = useJournalSheetCsvExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const withJournalLoose = withJournal as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withJournalActionsLoose = withJournalActions as unknown as (
  component: React.ComponentType<any>,
) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар журнала проводок на общем shadcn-тулбаре (FinancialReportToolbar).
 * Действия те же, что в легаси JournalActionsBar: настроить отчёт,
 * пересчитать, печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function JournalToolbarV2Root({
  isFilterDrawerOpen,
  toggleJournalSheetFilter: toggleFilterDrawer,
  openDialog,
}: JournalToolbarReduxProps & WithDialogActionsProps) {
  const { refetchSheet, httpQuery } = useJournalSheetContextTyped();

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
    openDialog(DialogsName.JournalPdfPreview);
  };

  return (
    <FinancialReportToolbar
      customizeActive={Boolean(isFilterDrawerOpen)}
      onCustomizeClick={() => toggleFilterDrawer()}
      onRefreshClick={() => refetchSheet()}
      onPrintClick={handlePrintClick}
      onXlsxExportClick={handleXlsxExportClick}
      onCsvExportClick={handleCsvExportClick}
    />
  );
}

export const JournalToolbarV2 = compose(
  withJournalLoose(({ journalSheetDrawerFilter }) => ({
    isFilterDrawerOpen: journalSheetDrawerFilter,
  })),
  withJournalActionsLoose,
  withDialogActions,
)(JournalToolbarV2Root) as React.ComponentType;
