import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import InvoicesEmptyStatus from './InvoicesEmptyStatus';

import { TABLES } from '@/constants/tables';
import {
  DataTable,
  DashboardContentTable,
  TableSkeletonHeader,
  TableSkeletonRows,
} from '@/components';

import { withInvoices } from './withInvoices';
import { withInvoiceActions } from './withInvoiceActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withSettings } from '@/containers/Settings/withSettings';

import { useMemorizedColumnsWidths } from '@/hooks';
import { useInvoicesTableColumns, ActionsMenu } from './components';
import { useInvoicesListContext } from './InvoicesListProvider';

import { compose } from '@/utils';
import { DRAWERS } from '@/constants/drawers';
import { DialogsName } from '@/constants/dialogs';

/**
 * Invoices datatable.
 */
function InvoicesDataTable({
  // #withInvoicesActions
  setInvoicesTableState,
  setInvoicesSelectedRows,

  // #withInvoices
  invoicesTableState,

  // #withAlertActions
  openAlert,

  // #withDrawerActions
  openDrawer,

  // #withDialogAction
  openDialog,

  // #withSettings
  invoicesTableSize,
}: any) {
  const history = useHistory();

  // Invoices list context.
  const {
    invoices,
    pagination,
    isEmptyStatus,
    isInvoicesLoading,
    isInvoicesFetching,
  } = useInvoicesListContext();

  // Invoices table columns.
  const columns = useInvoicesTableColumns();

  // Handle delete sale invoice.
  const handleDeleteInvoice = ({ id }: any) => {
    openAlert('invoice-delete', { invoiceId: id });
  };

  // Handle cancel/confirm invoice deliver.
  const handleDeliverInvoice = ({ id }: any) => {
    openAlert('invoice-deliver', { invoiceId: id });
  };

  // Handle edit sale invoice.
  const handleEditInvoice = (invoice: any) => {
    history.push(`/invoices/${invoice.id}/edit`);
  };

  // Handle convert to credit note.
  const handleConvertToCreitNote = ({ id }: any) => {
    history.push(`/credit-notes/new?from_invoice_id=${id}`, { invoiceId: id });
  };

  // handle quick payment receive.
  const handleQuickPaymentReceive = ({ id }: any) => {
    openDialog('quick-payment-receive', { invoiceId: id });
  };

  // Handle view detail invoice.
  const handleViewDetailInvoice = ({ id }: any) => {
    openDrawer(DRAWERS.INVOICE_DETAILS, { invoiceId: id });
  };

  // Handle print invoices.
  const handlePrintInvoice = ({ id }: any) => {
    openDialog('invoice-pdf-preview', { invoiceId: id });
  };

  // Handle send mail invoice.
  const handleSendMailInvoice = ({ id }: any) => {
    openDrawer(DRAWERS.INVOICE_SEND_MAIL, { invoiceId: id });
  };

  // Handle cell click.
  const handleCellClick = (cell: any, event: any) => {
    openDrawer(DRAWERS.INVOICE_DETAILS, { invoiceId: cell.row.original.id });
  };

  // Local storage memorizing columns widths.
  const [initialColumnsWidths, , handleColumnResizing] =
    useMemorizedColumnsWidths(TABLES.INVOICES);

  // Handles fetch data once the table state change.
  const handleDataTableFetchData = useCallback(
    ({ pageSize, pageIndex, sortBy }: any) => {
      setInvoicesTableState({
        pageSize,
        pageIndex,
        sortBy,
      });
    },
    [setInvoicesTableState],
  );

  // Handle selected rows change.
  const handleSelectedRowsChange = useCallback(
    (selectedFlatRows: any) => {
      const selectedIds = selectedFlatRows?.map((row: any) => row.original.id) || [];
      setInvoicesSelectedRows(selectedIds);
    },
    [setInvoicesSelectedRows],
  );

  // Display invoice empty status instead of the table.
  if (isEmptyStatus) {
    return <InvoicesEmptyStatus />;
  }

  return (
    <DashboardContentTable>
      <DataTable
        columns={columns}
        data={invoices}
        loading={isInvoicesLoading}
        headerLoading={isInvoicesLoading}
        progressBarLoading={isInvoicesFetching}
        onFetchData={handleDataTableFetchData}
        manualSortBy={true}
        selectionColumn={true}
        onSelectedRowsChange={handleSelectedRowsChange}
        noInitialFetch={true}
        sticky={true}
        pagination={true}
        initialPageSize={invoicesTableState.pageSize}
        manualPagination={true}
        pagesCount={pagination.pagesCount}
        autoResetSortBy={false}
        autoResetPage={false}
        autoResetSelectedRows={false}
        TableLoadingRenderer={TableSkeletonRows}
        TableHeaderSkeletonRenderer={TableSkeletonHeader}
        ContextMenu={ActionsMenu}
        onCellClick={handleCellClick}
        initialColumnsWidths={initialColumnsWidths}
        onColumnResizing={handleColumnResizing}
        size={invoicesTableSize}
        payload={{
          onDelete: handleDeleteInvoice,
          onDeliver: handleDeliverInvoice,
          onEdit: handleEditInvoice,
          onQuick: handleQuickPaymentReceive,
          onViewDetails: handleViewDetailInvoice,
          onPrint: handlePrintInvoice,
          onConvert: handleConvertToCreitNote,
          onSendMail: handleSendMailInvoice
        }}
      />
    </DashboardContentTable>
  );
}

export default compose(
  withDashboardActions,
  withInvoiceActions,
  withAlertActions,
  withDrawerActions,
  withDialogActions,
  withInvoices(({ invoicesTableState }: any) => ({ invoicesTableState })),
  withSettings(({ invoiceSettings }: any) => ({
    invoicesTableSize: invoiceSettings?.tableSize,
  })),
)(InvoicesDataTable);
