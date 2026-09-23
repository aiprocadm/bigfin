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
  useSalesByItemsCsvExport,
  useSalesByItemsXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';
import { useCanExport } from '@/hooks/utils/useAbilityContext';

import {
  FinancialReportToolbar,
  type ReportNumberFormatValues,
} from '../../v2';
import { useSalesByItemsContext } from '../SalesByItemProvider';
import { withSalesByItems } from '../withSalesByItems';
import { withSalesByItemsActions } from '../withSalesByItemsActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface SalesByItemsToolbarOwnProps {
  numberFormat?: Partial<ReportNumberFormatValues>;
  onNumberFormatSubmit: (values: ReportNumberFormatValues) => void;
}

interface SalesByItemsToolbarReduxProps {
  // #withSalesByItems
  salesByItemsDrawerFilter: boolean;
  // #withSalesByItemsActions
  toggleSalesByItemsFilterDrawer: (toggle?: boolean) => void;
}

interface SalesByItemsContextShape {
  refetchSheet: () => void;
  isLoading: boolean;
  httpQuery: Record<string, unknown>;
}

const useSalesByItemsContextTyped =
  useSalesByItemsContext as unknown as () => SalesByItemsContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

const useXlsxExportTyped = useSalesByItemsXlsxExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = useSalesByItemsCsvExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const withSalesByItemsLoose = withSalesByItems as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withSalesByItemsActionsLoose = withSalesByItemsActions as unknown as (
  component: React.ComponentType<any>,
) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар отчёта «Продажи по позициям» на общем shadcn-тулбаре
 * (FinancialReportToolbar). Действия те же, что в легаси
 * SalesByItemsActionsBar: настроить отчёт, формат чисел, пересчитать,
 * печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function SalesByItemsToolbarV2Root({
  salesByItemsDrawerFilter,
  toggleSalesByItemsFilterDrawer: toggleFilterDrawer,
  openDialog,
  numberFormat,
  onNumberFormatSubmit,
}: SalesByItemsToolbarOwnProps &
  SalesByItemsToolbarReduxProps &
  WithDialogActionsProps) {
  const { refetchSheet, isLoading, httpQuery } = useSalesByItemsContextTyped();

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
    openDialog(DialogsName.SalesByItemsPdfPreview);
  };

  return (
    <FinancialReportToolbar
      customizeActive={Boolean(salesByItemsDrawerFilter)}
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

export const SalesByItemsToolbarV2 = compose(
  withSalesByItemsLoose(({ salesByItemsDrawerFilter }) => ({
    salesByItemsDrawerFilter,
  })),
  withSalesByItemsActionsLoose,
  withDialogActions,
)(SalesByItemsToolbarV2Root) as React.ComponentType<SalesByItemsToolbarOwnProps>;
