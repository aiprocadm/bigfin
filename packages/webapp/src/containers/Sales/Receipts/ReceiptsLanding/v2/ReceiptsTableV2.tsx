import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Receipt } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, SaleReceiptAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useReceiptsListContext } from '../ReceiptsListProvider';
import { withReceipts } from '../withReceipts';
import { withReceiptsActions } from '../withReceiptsActions';
import { useReceiptsTableColumnsV2 } from './useReceiptsTableColumnsV2';
import type { ReceiptRow } from './ReceiptsActionsMenuV2';

const getReceiptRowId = (row: ReceiptRow) => String(row.id);

function ReceiptsEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<Receipt className="h-8 w-8" aria-hidden />}
      title={intl.get('receipts.empty.title')}
      description={intl.get('receipt_empty_status_description')}
      action={
        <Can I={SaleReceiptAction.Create} a={AbilitySubject.Receipt}>
          <Button onClick={() => history.push('/receipts/new')}>
            {intl.get('new_receipt')}
          </Button>
        </Can>
      }
    />
  );
}

function ReceiptsTableV2Root({
  // #withReceiptsActions
  setReceiptsTableState,
  setReceiptsSelectedRows,
  // #withReceipts
  receiptTableState,
  // #withAlertActions
  openAlert,
  // #withDialogActions
  openDialog,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const {
    isEmptyStatus,
    receipts,
    pagination,
    isReceiptsLoading,
    isReceiptsFetching,
  } = useReceiptsListContext() as any;

  const columns = useReceiptsTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.RECEIPT_DETAILS, { receiptId: row.id }),
    onEdit: (row) => history.push(`/receipts/${row.id}/edit`),
    onClose: (row) => openAlert('receipt-close', { receiptId: row.id }),
    onSendMail: (row) =>
      openDrawer(DRAWERS.RECEIPT_SEND_MAIL, { receiptId: row.id }),
    onPrint: (row) => openDialog('receipt-pdf-preview', { receiptId: row.id }),
    onDelete: (row) => openAlert('receipt-delete', { receiptId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setReceiptsTableState({ sortBy });
    },
    [setReceiptsTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setReceiptsSelectedRows(ids.map(Number));
    },
    [setReceiptsSelectedRows],
  );

  if (isEmptyStatus) {
    return <ReceiptsEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={receipts ?? []}
        getRowId={getReceiptRowId}
        loading={isReceiptsLoading || isReceiptsFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: ReceiptRow) =>
          openDrawer(DRAWERS.RECEIPT_DETAILS, { receiptId: row.id })
        }
        emptyState={<ReceiptsEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={receiptTableState?.pageIndex ?? 0}
        pageSize={receiptTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setReceiptsTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setReceiptsTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const ReceiptsTableV2 = compose(
  withAlertActions,
  withDialogActions,
  withDrawerActions,
  withReceiptsActions,
  withReceipts(({ receiptTableState }: any) => ({ receiptTableState })),
)(ReceiptsTableV2Root);
