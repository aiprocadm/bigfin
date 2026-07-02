import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Undo2 } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, VendorCreditAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useVendorsCreditNoteListContext } from '../VendorsCreditNoteListProvider';
import { withVendorsCreditNotes } from '../withVendorsCreditNotes';
import { withVendorsCreditNotesActions } from '../withVendorsCreditNotesActions';
import { useVendorsCreditNotesTableColumnsV2 } from './useVendorsCreditNotesTableColumnsV2';
import type { VendorCreditRow } from './VendorsCreditNotesActionsMenuV2';

const getVendorCreditRowId = (row: VendorCreditRow) => String(row.id);

function VendorsCreditNotesEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<Undo2 className="h-8 w-8" aria-hidden />}
      title={intl.get('vendor_credits.empty_status.title')}
      description={intl.get('vendor_credits.empty_status.description')}
      action={
        <Can I={VendorCreditAction.Create} a={AbilitySubject.VendorCredit}>
          <Button onClick={() => history.push('/vendor-credits/new')}>
            {intl.get('vendor_credits.label.new_vendor_credit')}
          </Button>
        </Can>
      }
    />
  );
}

function VendorsCreditNotesTableV2Root({
  // #withVendorsCreditNotesActions
  setVendorsCreditNoteTableState,
  setVendorsCreditNoteSelectedRows,
  // #withVendorsCreditNotes
  vendorsCreditNoteTableState,
  // #withAlertActions
  openAlert,
  // #withDialogActions
  openDialog,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const {
    vendorCredits,
    pagination,
    isEmptyStatus,
    isVendorCreditsFetching,
    isVendorCreditsLoading,
  } = useVendorsCreditNoteListContext() as any;

  const columns = useVendorsCreditNotesTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.VENDOR_CREDIT_DETAILS, { vendorCreditId: row.id }),
    onEdit: (row) => history.push(`/vendor-credits/${row.id}/edit`),
    onOpen: (row) => openAlert('vendor-credit-open', { vendorCreditId: row.id }),
    onRefund: (row) =>
      openDialog('refund-vendor-credit', { vendorCreditId: row.id }),
    onReconcile: (row) =>
      openDialog('reconcile-vendor-credit', { vendorCreditId: row.id }),
    onDelete: (row) =>
      openAlert('vendor-credit-delete', { vendorCreditId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setVendorsCreditNoteTableState({ sortBy });
    },
    [setVendorsCreditNoteTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setVendorsCreditNoteSelectedRows(ids.map(Number));
    },
    [setVendorsCreditNoteSelectedRows],
  );

  if (isEmptyStatus) {
    return <VendorsCreditNotesEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={vendorCredits ?? []}
        getRowId={getVendorCreditRowId}
        loading={isVendorCreditsLoading || isVendorCreditsFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: VendorCreditRow) =>
          openDrawer(DRAWERS.VENDOR_CREDIT_DETAILS, { vendorCreditId: row.id })
        }
        emptyState={<VendorsCreditNotesEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={vendorsCreditNoteTableState?.pageIndex ?? 0}
        pageSize={vendorsCreditNoteTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) =>
          setVendorsCreditNoteTableState({ pageIndex })
        }
        onPageSizeChange={(pageSize) =>
          setVendorsCreditNoteTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const VendorsCreditNotesTableV2 = compose(
  withVendorsCreditNotesActions,
  withDrawerActions,
  withAlertActions,
  withDialogActions,
  withVendorsCreditNotes(({ vendorsCreditNoteTableState }: any) => ({
    vendorsCreditNoteTableState,
  })),
)(VendorsCreditNotesTableV2Root);
