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
  usePurchasesByItemsCsvExport,
  usePurchasesByItemsXlsxExport,
} from '@/hooks/query';
import { compose } from '@/utils';
import { useCanExport } from '@/hooks/utils/useAbilityContext';

import {
  FinancialReportToolbar,
  type ReportNumberFormatValues,
} from '../../v2';
import { usePurchaseByItemsContext } from '../PurchasesByItemsProvider';
import { withPurchasesByItems } from '../withPurchasesByItems';
import { withPurchasesByItemsActions } from '../withPurchasesByItemsActions';

// ---------------------------------------------------------------------------
// Типы и локальные касты легаси-модулей (контекст и хуки без типов).
// ---------------------------------------------------------------------------

interface PurchasesByItemsToolbarOwnProps {
  numberFormat?: Partial<ReportNumberFormatValues>;
  onNumberFormatSubmit: (values: ReportNumberFormatValues) => void;
}

interface PurchasesByItemsToolbarReduxProps {
  // #withPurchasesByItems
  purchasesByItemsDrawerFilter: boolean;
  // #withPurchasesByItemsActions
  togglePurchasesByItemsFilterDrawer: (toggle?: boolean) => void;
}

interface PurchasesByItemsContextShape {
  refetchSheet: () => void;
  isLoading: boolean;
  httpQuery: Record<string, unknown>;
}

const usePurchasesByItemsContextTyped =
  usePurchaseByItemsContext as unknown as () => PurchasesByItemsContextShape;

type ExportMutation = { mutateAsync: () => Promise<unknown> };

const useXlsxExportTyped = usePurchasesByItemsXlsxExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const useCsvExportTyped = usePurchasesByItemsCsvExport as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => ExportMutation;

const withPurchasesByItemsLoose = withPurchasesByItems as unknown as (
  mapState?: (mapped: Record<string, unknown>) => Record<string, unknown>,
) => (component: React.ComponentType<any>) => React.ComponentType<any>;

const withPurchasesByItemsActionsLoose =
  withPurchasesByItemsActions as unknown as (
    component: React.ComponentType<any>,
  ) => React.ComponentType<any>;

const showToast = AppToaster.show as unknown as (config: {
  message: string;
  intent?: string;
}) => void;

/**
 * Экшнбар отчёта «Закупки по позициям» на общем shadcn-тулбаре
 * (FinancialReportToolbar). Действия те же, что в легаси
 * PurchasesByItemsActionsBar: настроить отчёт, формат чисел, пересчитать,
 * печать (PDF-диалог по имени), экспорт XLSX/CSV.
 */
function PurchasesByItemsToolbarV2Root({
  purchasesByItemsDrawerFilter,
  togglePurchasesByItemsFilterDrawer: toggleFilterDrawer,
  openDialog,
  numberFormat,
  onNumberFormatSubmit,
}: PurchasesByItemsToolbarOwnProps &
  PurchasesByItemsToolbarReduxProps &
  WithDialogActionsProps) {
  const { refetchSheet, isLoading, httpQuery } =
    usePurchasesByItemsContextTyped();

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
    openDialog(DialogsName.PurchasesByItemsPdfPreview);
  };

  return (
    <FinancialReportToolbar
      customizeActive={Boolean(purchasesByItemsDrawerFilter)}
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

export const PurchasesByItemsToolbarV2 = compose(
  withPurchasesByItemsLoose(({ purchasesByItemsDrawerFilter }) => ({
    purchasesByItemsDrawerFilter,
  })),
  withPurchasesByItemsActionsLoose,
  withDialogActions,
)(PurchasesByItemsToolbarV2Root) as React.ComponentType<PurchasesByItemsToolbarOwnProps>;
