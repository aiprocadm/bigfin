import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { compose } from '@/utils';
import {
  DataTable,
  DashboardContentTable,
  TableSkeletonRows,
  TableSkeletonHeader,
} from '@/components';
import { TABLES } from '@/constants/tables';

import ReceiptsEmptyStatus from './ReceiptsEmptyStatus';

import { withReceipts } from './withReceipts';
import { withReceiptsActions } from './withReceiptsActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withSettings } from '@/containers/Settings/withSettings';

import { useReceiptsListContext } from './ReceiptsListProvider';
import { useReceiptsTableColumns, ActionsMenu } from './components';
import { useMemorizedColumnsWidths } from '@/hooks';
import { DRAWERS } from '@/constants/drawers';
import { DialogsName } from '@/constants/dialogs';

/**
 * Sale receipts datatable.
 */
function ReceiptsDataTable({
  // #withReceiptsActions
  setReceiptsTableState,
  setReceiptsSelectedRows,

  // #withReceipts
  receiptTableState,

  // #withAlertActions
  openAlert,

  // #withDrawerActions
  openDrawer,

  // #withDialogAction
  openDialog,

  // #withSettings
  receiptsTableSize,
}: any) {
  const history = useHistory();

  // Receipts list context.
  const {
    receipts,
    pagination,
    isReceiptsFetching,
    isReceiptsLoading,
    isEmptyStatus,
  } = useReceiptsListContext();

  // Receipts table columns.
  const columns = useReceiptsTableColumns();

  // Handle receipt edit action.
  const handleEditReceipt = ({ id }: any) => {
    history.push(`/receipts/${id}/edit`);
  };

  // Handles receipt delete action.
  const handleDeleteReceipt = (receipt: any) => {
    openAlert('receipt-delete', { receiptId: receipt.id });
  };

  // Handles receipt close action.
  const handleCloseReceipt = (receipt: any) => {
    openAlert('receipt-close', { receiptId: receipt.id });
  };

  // Handle view detail receipt.
  const handleViewDetailReceipt = ({ id }: any) => {
    openDrawer(DRAWERS.RECEIPT_DETAILS, { receiptId: id });
  };

  // Handle print receipt.
  const handlePrintInvoice = ({ id }: any) => {
    openDialog('receipt-pdf-preview', { receiptId: id });
  };

  // Handle send mail receipt.
  const handleSendMailReceipt = ({ id }: any) => {
    openDrawer(DRAWERS.RECEIPT_SEND_MAIL, { receiptId: id });
  };

  // Local storage memorizing columns widths.
  const [initialColumnsWidths, , handleColumnResizing] =
    useMemorizedColumnsWidths(TABLES.RECEIPTS);

  // Handles the datable fetch data once the state changing.
  const handleDataTableFetchData = useCallback(
    ({ sortBy, pageIndex, pageSize }: any) => {
      setReceiptsTableState({
        pageIndex,
        pageSize,
        sortBy,
      });
    },
    [setReceiptsTableState],
  );
  // Handle cell click.
  const handleCellClick = (cell: any, event: any) => {
    openDrawer(DRAWERS.RECEIPT_DETAILS, { receiptId: cell.row.original.id });
  };
  // Handle selected rows change.
  const handleSelectedRowsChange = (selectedRows: any) => {
    const selectedIds = selectedRows?.map((row: any) => row.original.id) || [];
    setReceiptsSelectedRows(selectedIds);
  };

  if (isEmptyStatus) {
    return <ReceiptsEmptyStatus />;
  }

  return (
    <DashboardContentTable>
      <DataTable
        columns={columns}
        data={receipts}
        loading={isReceiptsLoading}
        headerLoading={isReceiptsLoading}
        progressBarLoading={isReceiptsFetching}
        onFetchData={handleDataTableFetchData}
        manualSortBy={true}
        selectionColumn={true}
        noInitialFetch={true}
        sticky={true}
        pagination={true}
        initialPageSize={receiptTableState.pageSize}
        pagesCount={pagination.pagesCount}
        manualPagination={true}
        autoResetSortBy={false}
        autoResetPage={false}
        TableLoadingRenderer={TableSkeletonRows}
        TableHeaderSkeletonRenderer={TableSkeletonHeader}
        ContextMenu={ActionsMenu}
        onCellClick={handleCellClick}
        initialColumnsWidths={initialColumnsWidths}
        onColumnResizing={handleColumnResizing}
        size={receiptsTableSize}
        onSelectedRowsChange={handleSelectedRowsChange}
        payload={{
          onEdit: handleEditReceipt,
          onDelete: handleDeleteReceipt,
          onClose: handleCloseReceipt,
          onViewDetails: handleViewDetailReceipt,
          onPrint: handlePrintInvoice,
          onSendMail: handleSendMailReceipt,
        }}
      />
    </DashboardContentTable>
  );
}

export default compose(
  withAlertActions,
  withReceiptsActions,
  withDrawerActions,
  withDialogActions,
  withReceipts(({ receiptTableState }: any) => ({ receiptTableState })),
  withSettings(({ receiptSettings }: any) => ({
    receiptsTableSize: receiptSettings?.tableSize,
  })),
)(ReceiptsDataTable);
