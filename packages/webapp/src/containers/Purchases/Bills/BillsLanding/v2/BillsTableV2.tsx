import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, BillAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useBillsListContext } from '../BillsListProvider';
import { withBills } from '../withBills';
import { withBillsActions } from '../withBillsActions';
import { useBillsTableColumnsV2 } from './useBillsTableColumnsV2';
import type { BillRow } from './BillsActionsMenuV2';

const getBillRowId = (row: BillRow) => String(row.id);

function BillsEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<ReceiptText className="h-8 w-8" aria-hidden />}
      title={intl.get('bills.empty_state.title')}
      description={intl.get('bill_empty_status_description')}
      action={
        <Can I={BillAction.Create} a={AbilitySubject.Bill}>
          <Button onClick={() => history.push('/bills/new')}>
            {intl.get('new_bill')}
          </Button>
        </Can>
      }
    />
  );
}

function BillsTableV2Root({
  // #withBillsActions
  setBillsTableState,
  setBillsSelectedRows,
  // #withBills
  billsTableState,
  // #withAlertActions
  openAlert,
  // #withDialogActions
  openDialog,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const { isEmptyStatus, bills, pagination, isBillsLoading, isBillsFetching } =
    useBillsListContext() as any;

  const columns = useBillsTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.BILL_DETAILS, { billId: row.id }),
    onEdit: (row) => history.push(`/bills/${row.id}/edit`),
    onConvert: (row) =>
      history.push(`/vendor-credits/new?from_bill_id=${row.id}`, {
        billId: row.id,
      }),
    onOpen: (row) => openAlert('bill-open', { billId: row.id }),
    onQuickPayment: (row) => openDialog('quick-payment-made', { billId: row.id }),
    onAllocateLandedCost: (row) =>
      openDialog('allocate-landed-cost', { billId: row.id }),
    onDelete: (row) => openAlert('bill-delete', { billId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setBillsTableState({ sortBy });
    },
    [setBillsTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setBillsSelectedRows(ids.map(Number));
    },
    [setBillsSelectedRows],
  );

  if (isEmptyStatus) {
    return <BillsEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={bills ?? []}
        getRowId={getBillRowId}
        loading={isBillsLoading || isBillsFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: BillRow) =>
          openDrawer(DRAWERS.BILL_DETAILS, { billId: row.id })
        }
        emptyState={<BillsEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={billsTableState?.pageIndex ?? 0}
        pageSize={billsTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setBillsTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setBillsTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const BillsTableV2 = compose(
  withAlertActions,
  withDialogActions,
  withDrawerActions,
  withBillsActions,
  withBills(({ billsTableState }: any) => ({ billsTableState })),
)(BillsTableV2Root);
