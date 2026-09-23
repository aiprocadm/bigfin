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
  useInventoryValuationCsvExport,
  useInventoryValuationXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';
import { useCanExport } from '@/hooks/utils/useAbilityContext';

import {
  FinancialReportToolbar,
  type ReportNumberFormatValues,
} from '../../v2';
import { useInventoryValuationContext } from '../InventoryValuationProvider';
import { withInventoryValuation } from '../withInventoryValuation';
import { withInventoryValuationActions } from '../withInventoryValuationActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface InventoryValuationToolbarOwnProps {
  numberFormat?: Partial<ReportNumberFormatValues>;
  onNumberFormatSubmit: (values: ReportNumberFormatValues) => void;
}

interface InventoryValuationToolbarReduxProps {
  // #withInventoryValuation
  isFilterDrawerOpen: boolean;
  // #withInventoryValuationActions
  toggleInventoryValuationFilterDrawer: (toggle?: boolean) => void;
}

interface InventoryValuationContextShape {
  refetchSheet: () => void;
  isLoading: boolean;
  httpQuery: Record<string, unknown>;
}

const useInventoryValuationContextTyped =
  useInventoryValuationContext as unknown as () => InventoryValuationContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

const useXlsxExportTyped = useInventoryValuationXlsxExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = useInventoryValuationCsvExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const withInventoryValuationLoose = withInventoryValuation as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withInventoryValuationActionsLoose =
  withInventoryValuationActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар отчёта «Оценка запасов» на общем shadcn-тулбаре
 * (FinancialReportToolbar). Действия те же, что в легаси
 * InventoryValuationActionsBar: настроить отчёт, формат чисел, пересчитать,
 * печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function InventoryValuationToolbarV2Root({
  isFilterDrawerOpen,
  toggleInventoryValuationFilterDrawer: toggleFilterDrawer,
  openDialog,
  numberFormat,
  onNumberFormatSubmit,
}: InventoryValuationToolbarOwnProps &
  InventoryValuationToolbarReduxProps &
  WithDialogActionsProps) {
  const { refetchSheet, isLoading, httpQuery } =
    useInventoryValuationContextTyped();

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
    openDialog(DialogsName.InventoryValuationPdfPreview);
  };

  return (
    <FinancialReportToolbar
      customizeActive={Boolean(isFilterDrawerOpen)}
      onCustomizeClick={() => toggleFilterDrawer()}
      onRefreshClick={() => refetchSheet()}
      onPrintClick={handlePrintClick}
      onXlsxExportClick={canExport ? handleXlsxExportClick : undefined}
      onCsvExportClick={canExport ? handleCsvExportClick : undefined}
      numberFormat={numberFormat ?? {}}
      onNumberFormatSubmit={onNumberFormatSubmit}
      numberFormatDisabled={isLoading}
    />
  );
}

export const InventoryValuationToolbarV2 = compose(
  withInventoryValuationLoose(({ inventoryValuationDrawerFilter }) => ({
    isFilterDrawerOpen: inventoryValuationDrawerFilter,
  })),
  withInventoryValuationActionsLoose,
  withDialogActions,
)(
  InventoryValuationToolbarV2Root,
) as React.ComponentType<InventoryValuationToolbarOwnProps>;
