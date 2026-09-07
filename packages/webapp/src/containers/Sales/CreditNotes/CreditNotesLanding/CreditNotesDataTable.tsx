import React from 'react';
import { useHistory } from 'react-router-dom';

import { TABLES } from '@/constants/tables';
import {
  DataTable,
  DashboardContentTable,
  TableSkeletonRows,
  TableSkeletonHeader,
} from '@/components';
import { useMemorizedColumnsWidths } from '@/hooks';

import CreditNoteEmptyStatus from './CreditNotesEmptyStatus';

import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withCreditNotesActions } from './withCreditNotesActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withSettings } from '@/containers/Settings/withSettings';
import { withCreditNotes } from './withCreditNotes';

import { useCreditNoteTableColumns, ActionsMenu } from './components';
import { useCreditNoteListContext } from './CreditNotesListProvider';

import { compose } from '@/utils';
import { DRAWERS } from '@/constants/drawers';

/**
 * Credit note data table.
 */
function CreditNotesDataTable({
  // #withCreditNotesActions
  setCreditNotesTableState,
  setCreditNotesSelectedRows,

  // #withAlertActions
  openAlert,

  // #withDrawerActions
  openDrawer,

  // #withDialogAction
  openDialog,

  // #withSettings
  creditNoteTableSize,

  // #withCreditNotes
  creditNoteTableState
}: any) {
  const history = useHistory();

  // Credit note list context.
  const {
    creditNotes,
    pagination,
    isEmptyStatus,
    isCreditNotesFetching,
    isCreditNotesLoading,
  } = useCreditNoteListContext();

  // Credit note table columns.
  const columns = useCreditNoteTableColumns();

  // Local storage memorizing columns widths.
  const [initialColumnsWidths, , handleColumnResizing] =
    useMemorizedColumnsWidths(TABLES.CREDIT_NOTES);

  // Handles fetch data once the table state change.
  const handleDataTableFetchData = React.useCallback(
    ({ pageSize, pageIndex, sortBy }: any) => {
      setCreditNotesTableState({
        pageSize,
        pageIndex,
        sortBy,
      });
    },
    [setCreditNotesTableState],
  );

  // Handle selected rows change.
  const handleSelectedRowsChange = React.useCallback(
    (selectedFlatRows: any) => {
      const selectedIds = selectedFlatRows?.map((row: any) => row.original.id) || [];
      setCreditNotesSelectedRows(selectedIds);
    },
    [setCreditNotesSelectedRows],
  );

  // Display create note empty status instead of the table.
  if (isEmptyStatus) {
    return <CreditNoteEmptyStatus />;
  }

  const handleViewDetailCreditNote = ({ id }: any) => {
    openDrawer(DRAWERS.CREDIT_NOTE_DETAILS, { creditNoteId: id });
  };

  // Отправка кредит-ноты по email (Р3б карты v18).
  const handleSendMailCreditNote = ({ id }: any) => {
    openDrawer(DRAWERS.CREDIT_NOTE_SEND_MAIL, { creditNoteId: id });
  };

  // Handle delete credit note.
  const handleDeleteCreditNote = ({ id }: any) => {
    openAlert('credit-note-delete', { creditNoteId: id });
  };

  // Handle edit credit note.
  const hanldeEditCreditNote = (creditNote: any) => {
    history.push(`/credit-notes/${creditNote.id}/edit`);
  };

  // Handle cell click.
  const handleCellClick = (cell: any, event: any) => {
    openDrawer(DRAWERS.CREDIT_NOTE_DETAILS, {
      creditNoteId: cell.row.original.id,
    });
  };

  const handleRefundCreditNote = ({ id }: any) => {
    openDialog('refund-credit-note', { creditNoteId: id });
  };

  // Handle cancel/confirm crdit note open.
  const handleOpenCreditNote = ({ id }: any) => {
    openAlert('credit-note-open', { creditNoteId: id });
  };

  // Handle reconcile credit note.
  const handleReconcileCreditNote = ({ id }: any) => {
    openDialog('reconcile-credit-note', { creditNoteId: id });
  };

  return (
    <DashboardContentTable>
      <DataTable
        columns={columns}
        data={creditNotes}
        loading={isCreditNotesLoading}
        headerLoading={isCreditNotesLoading}
        progressBarLoading={isCreditNotesFetching}
        onFetchData={handleDataTableFetchData}
        onSelectedRowsChange={handleSelectedRowsChange}
        autoResetSelectedRows={false}
        manualSortBy={true}
        selectionColumn={true}
        noInitialFetch={true}
        sticky={true}
        pagination={true}
        initialPageSize={creditNoteTableState.pageSize}
        pagesCount={pagination.pagesCount}
        TableLoadingRenderer={TableSkeletonRows}
        TableHeaderSkeletonRenderer={TableSkeletonHeader}
        ContextMenu={ActionsMenu}
        onCellClick={handleCellClick}
        initialColumnsWidths={initialColumnsWidths}
        onColumnResizing={handleColumnResizing}
        size={creditNoteTableSize}
        payload={{
          onViewDetails: handleViewDetailCreditNote,
          onDelete: handleDeleteCreditNote,
          onEdit: hanldeEditCreditNote,
          onRefund: handleRefundCreditNote,
          onOpen: handleOpenCreditNote,
          onReconcile: handleReconcileCreditNote,
          onSendMail: handleSendMailCreditNote,
        }}
      />
    </DashboardContentTable>
  );
}

export default compose(
  withDashboardActions,
  withCreditNotesActions,
  withDrawerActions,
  withAlertActions,
  withDialogActions,
  withSettings(({ creditNoteSettings }: any) => ({
    creditNoteTableSize: creditNoteSettings?.tableSize,
  })),
  withCreditNotes(({ creditNoteTableState }: any) => ({ creditNoteTableState }))
)(CreditNotesDataTable);
