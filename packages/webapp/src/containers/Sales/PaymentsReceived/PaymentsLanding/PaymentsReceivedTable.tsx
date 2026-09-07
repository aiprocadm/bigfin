import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { compose } from '@/utils';
import { TABLES } from '@/constants/tables';
import {
  DataTable,
  DashboardContentTable,
  TableSkeletonRows,
  TableSkeletonHeader,
} from '@/components';

import PaymentReceivesEmptyStatus from './PaymentsReceivedEmptyStatus';

import { withPaymentsReceived } from './withPaymentsReceived';
import { withPaymentsReceivedActions } from './withPaymentsReceivedActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withSettings } from '@/containers/Settings/withSettings';

import { usePaymentReceivesColumns, ActionsMenu } from './components';
import { usePaymentsReceivedListContext } from './PaymentsReceivedListProvider';
import { useMemorizedColumnsWidths } from '@/hooks';
import { DRAWERS } from '@/constants/drawers';
import { DialogsName } from '@/constants/dialogs';

/**
 * Payment receives datatable.
 */
function PaymentsReceivedDataTable({
  // #withPaymentsReceivedActions
  setPaymentReceivesTableState,
  setPaymentReceivesSelectedRows,

  // #withPaymentsReceived
  paymentReceivesTableState,

  // #withAlertActions
  openAlert,

  // #withDrawerActions
  openDrawer,

  // #withDialogActions
  openDialog,

  // #withSettings
  paymentReceivesTableSize,
}: any) {
  const history = useHistory();

  // Payment receives list context.
  const {
    paymentReceives,
    pagination,

    isPaymentReceivesLoading,
    isPaymentReceivesFetching,
    isEmptyStatus,
  } = usePaymentsReceivedListContext();

  // Payment receives columns.
  const columns = usePaymentReceivesColumns();

  // Handles edit payment receive.
  const handleEditPaymentReceive = ({ id }: any) => {
    history.push(`/payments-received/${id}/edit`);
  };

  // Handles delete payment receive.
  const handleDeletePaymentReceive = ({ id }: any) => {
    openAlert('payment-received-delete', { paymentReceiveId: id });
  };

  // Handle view detail  payment receive..
  const handleViewDetailPaymentReceive = ({ id }: any) => {
    openDrawer(DRAWERS.PAYMENT_RECEIVED_DETAILS, { paymentReceiveId: id });
  };

  // Handle mail send payment receive.
  const handleSendMailPayment = ({ id }: any) => {
    openDrawer(DRAWERS.PAYMENT_RECEIVED_SEND_MAIL, { paymentReceivedId: id });
  };

  // Handle cell click.
  const handleCellClick = (cell: any, event: any) => {
    openDrawer(DRAWERS.PAYMENT_RECEIVED_DETAILS, {
      paymentReceiveId: cell.row.original.id,
    });
  };

  // Local storage memorizing columns widths.
  const [initialColumnsWidths, , handleColumnResizing] =
    useMemorizedColumnsWidths(TABLES.PAYMENT_RECEIVES);

  // Handle datatable fetch once the table's state changing.
  const handleDataTableFetchData = useCallback(
    ({ pageIndex, pageSize, sortBy }: any) => {
      setPaymentReceivesTableState({
        pageIndex,
        pageSize,
        sortBy,
      });
    },
    [setPaymentReceivesTableState],
  );

  // Handle selected rows change.
  const handleSelectedRowsChange = (selectedRows: any) => {
    const selectedIds = selectedRows?.map((row: any) => row.original.id) || [];
    setPaymentReceivesSelectedRows(selectedIds);
  };

  // Display empty status instead of the table.
  if (isEmptyStatus) {
    return <PaymentReceivesEmptyStatus />;
  }

  return (
    <DashboardContentTable>
      <DataTable
        columns={columns}
        data={paymentReceives}
        loading={isPaymentReceivesLoading}
        headerLoading={isPaymentReceivesLoading}
        progressBarLoading={isPaymentReceivesFetching}
        onFetchData={handleDataTableFetchData}
        manualSortBy={true}
        selectionColumn={true}
        noInitialFetch={true}
        sticky={true}
        autoResetSortBy={false}
        autoResetPage={false}
        pagination={true}
        onSelectedRowsChange={handleSelectedRowsChange}
        initialPageSize={paymentReceivesTableState.pageSize}
        pagesCount={pagination.pagesCount}
        TableLoadingRenderer={TableSkeletonRows}
        TableHeaderSkeletonRenderer={TableSkeletonHeader}
        ContextMenu={ActionsMenu}
        onCellClick={handleCellClick}
        initialColumnsWidths={initialColumnsWidths}
        onColumnResizing={handleColumnResizing}
        size={paymentReceivesTableSize}
        payload={{
          onDelete: handleDeletePaymentReceive,
          onEdit: handleEditPaymentReceive,
          onViewDetails: handleViewDetailPaymentReceive,
          onSendMail: handleSendMailPayment,
        }}
      />
    </DashboardContentTable>
  );
}

export default compose(
  withPaymentsReceivedActions,
  withAlertActions,
  withDrawerActions,
  withDialogActions,
  withPaymentsReceived(({ paymentReceivesTableState }: any) => ({
    paymentReceivesTableState,
  })),
  withSettings(({ paymentReceiveSettings }: any) => ({
    paymentReceivesTableSize: paymentReceiveSettings?.tableSize,
  })),
)(PaymentsReceivedDataTable);
