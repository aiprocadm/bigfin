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
  useProfitLossSheetCsvExport,
  useProfitLossSheetXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';
import { useCanExport } from '@/hooks/utils/useAbilityContext';

import {
  FinancialReportToolbar,
  type ReportNumberFormatValues,
} from '../../v2';
import { useProfitLossSheetContext } from '../ProfitLossProvider';
import { withProfitLoss } from '../withProfitLoss';
import { withProfitLossActions } from '../withProfitLossActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface ProfitLossToolbarOwnProps {
  numberFormat?: Partial<ReportNumberFormatValues>;
  onNumberFormatSubmit: (values: ReportNumberFormatValues) => void;
}

interface ProfitLossToolbarReduxProps {
  // #withProfitLoss
  profitLossDrawerFilter: boolean;
  // #withProfitLossActions
  toggleProfitLossFilterDrawer: (toggle?: boolean) => void;
}

interface ProfitLossSheetContextShape {
  sheetRefetch: () => void;
  isLoading: boolean;
  httpQuery: Record<string, unknown>;
}

const useProfitLossContextTyped =
  useProfitLossSheetContext as unknown as () => ProfitLossSheetContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

const useXlsxExportTyped = useProfitLossSheetXlsxExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = useProfitLossSheetCsvExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const withProfitLossLoose = withProfitLoss as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withProfitLossActionsLoose = withProfitLossActions as unknown as (
  component: React.ComponentType<any>,
) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар ОПиУ на общем shadcn-тулбаре (FinancialReportToolbar).
 * Действия те же, что в легаси ProfitLossActionsBar: настроить отчёт,
 * формат чисел, пересчитать, печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function ProfitLossToolbarV2Root({
  profitLossDrawerFilter,
  toggleProfitLossFilterDrawer: toggleFilterDrawer,
  openDialog,
  numberFormat,
  onNumberFormatSubmit,
}: ProfitLossToolbarOwnProps &
  ProfitLossToolbarReduxProps &
  WithDialogActionsProps) {
  const { sheetRefetch, isLoading, httpQuery } = useProfitLossContextTyped();

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
    openDialog(DialogsName.ProfitLossSheetPdfPreview);
  };

  return (
    <FinancialReportToolbar
      customizeActive={Boolean(profitLossDrawerFilter)}
      onCustomizeClick={() => toggleFilterDrawer()}
      onRefreshClick={() => sheetRefetch()}
      onPrintClick={handlePrintClick}
      onXlsxExportClick={canExport ? handleXlsxExportClick : undefined}
      onCsvExportClick={canExport ? handleCsvExportClick : undefined}
      numberFormat={numberFormat ?? {}}
      onNumberFormatSubmit={onNumberFormatSubmit}
      numberFormatDisabled={isLoading}
    />
  );
}

export const ProfitLossToolbarV2 = compose(
  withProfitLossLoose(({ profitLossDrawerFilter }) => ({
    profitLossDrawerFilter,
  })),
  withProfitLossActionsLoose,
  withDialogActions,
)(ProfitLossToolbarV2Root) as React.ComponentType<ProfitLossToolbarOwnProps>;
