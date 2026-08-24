import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Undo2 } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, CreditNoteAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useCreditNoteListContext } from '../CreditNotesListProvider';
import { withCreditNotes } from '../withCreditNotes';
import { withCreditNotesActions } from '../withCreditNotesActions';
import { useCreditNotesTableColumnsV2 } from './useCreditNotesTableColumnsV2';
import type { CreditNoteRow } from './CreditNotesActionsMenuV2';

const getCreditNoteRowId = (row: CreditNoteRow) => String(row.id);

function CreditNotesEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<Undo2 className="h-8 w-8" aria-hidden />}
      title={intl.get('credit_note.empty_status.title')}
      description={intl.get('credit_note.empty_status.description')}
      action={
        <Can I={CreditNoteAction.Create} a={AbilitySubject.CreditNote}>
          <Button onClick={() => history.push('/credit-notes/new')}>
            {intl.get('credit_note.label.new_credit_note')}
          </Button>
        </Can>
      }
    />
  );
}

function CreditNotesTableV2Root({
  // #withCreditNotesActions
  setCreditNotesTableState,
  setCreditNotesSelectedRows,
  // #withCreditNotes
  creditNoteTableState,
  // #withAlertActions
  openAlert,
  // #withDialogActions
  openDialog,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const {
    creditNotes,
    pagination,
    isEmptyStatus,
    isCreditNotesFetching,
    isCreditNotesLoading,
  } = useCreditNoteListContext() as any;

  const columns = useCreditNotesTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.CREDIT_NOTE_DETAILS, { creditNoteId: row.id }),
    onEdit: (row) => history.push(`/credit-notes/${row.id}/edit`),
    onOpen: (row) => openAlert('credit-note-open', { creditNoteId: row.id }),
    onRefund: (row) =>
      openDialog('refund-credit-note', { creditNoteId: row.id }),
    onReconcile: (row) =>
      openDialog('reconcile-credit-note', { creditNoteId: row.id }),
    onDelete: (row) => openAlert('credit-note-delete', { creditNoteId: row.id }),
    // Отправка кредит-ноты по email (Р3б карты v18).
    onSendMail: (row) =>
      openDrawer(DRAWERS.CREDIT_NOTE_SEND_MAIL, { creditNoteId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setCreditNotesTableState({ sortBy });
    },
    [setCreditNotesTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setCreditNotesSelectedRows(ids.map(Number));
    },
    [setCreditNotesSelectedRows],
  );

  if (isEmptyStatus) {
    return <CreditNotesEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={creditNotes ?? []}
        getRowId={getCreditNoteRowId}
        loading={isCreditNotesLoading || isCreditNotesFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: CreditNoteRow) =>
          openDrawer(DRAWERS.CREDIT_NOTE_DETAILS, { creditNoteId: row.id })
        }
        emptyState={<CreditNotesEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={creditNoteTableState?.pageIndex ?? 0}
        pageSize={creditNoteTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setCreditNotesTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setCreditNotesTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const CreditNotesTableV2 = compose(
  withCreditNotesActions,
  withDrawerActions,
  withAlertActions,
  withDialogActions,
  withCreditNotes(({ creditNoteTableState }: any) => ({ creditNoteTableState })),
)(CreditNotesTableV2Root);
