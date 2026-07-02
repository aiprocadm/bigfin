import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useWarehouseTranfersListContext } from '../WarehouseTransfersListProvider';
import { withWarehouseTransfers } from '../withWarehouseTransfers';
import { withWarehouseTransfersActions } from '../withWarehouseTransfersActions';
import { useWarehouseTransfersTableColumnsV2 } from './useWarehouseTransfersTableColumnsV2';
import type { WarehouseTransferRow } from './WarehouseTransfersActionsMenuV2';

const getRowId = (row: WarehouseTransferRow) => String(row.id);

function WarehouseTransfersEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<ArrowLeftRight className="h-8 w-8" aria-hidden />}
      title={intl.get('warehouse_transfer.empty_status.title')}
      description={intl.get('warehouse_transfer.empty_status.description')}
      action={
        <Button onClick={() => history.push('/warehouses-transfers/new')}>
          {intl.get('warehouse_transfer.action.new_warehouse_transfer')}
        </Button>
      }
    />
  );
}

function WarehouseTransfersTableV2Root({
  // #withWarehouseTransfersActions
  setWarehouseTransferTableState,
  // #withWarehouseTransfers
  warehouseTransferTableState,
  // #withAlertActions
  openAlert,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const {
    warehousesTransfers,
    pagination,
    isEmptyStatus,
    isWarehouseTransfersLoading,
    isWarehouseTransfersFetching,
  } = useWarehouseTranfersListContext() as any;

  const columns = useWarehouseTransfersTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.WAREHOUSE_TRANSFER_DETAILS, {
        warehouseTransferId: row.id,
      }),
    onEdit: (row) => history.push(`/warehouses-transfers/${row.id}/edit`),
    onInitiate: (row) =>
      openAlert('warehouse-transfer-initate', { warehouseTransferId: row.id }),
    onTransfer: (row) =>
      openAlert('transferred-warehouse-transfer', {
        warehouseTransferId: row.id,
      }),
    onDelete: (row) =>
      openAlert('warehouse-transfer-delete', { warehouseTransferId: row.id }),
  });

  if (isEmptyStatus) {
    return <WarehouseTransfersEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={warehousesTransfers ?? []}
        getRowId={getRowId}
        loading={isWarehouseTransfersLoading || isWarehouseTransfersFetching}
        onSortChange={(sortBy) => setWarehouseTransferTableState({ sortBy })}
        onRowClick={(row: WarehouseTransferRow) =>
          openDrawer(DRAWERS.WAREHOUSE_TRANSFER_DETAILS, {
            warehouseTransferId: row.id,
          })
        }
        emptyState={<WarehouseTransfersEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={warehouseTransferTableState?.pageIndex ?? 0}
        pageSize={warehouseTransferTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) =>
          setWarehouseTransferTableState({ pageIndex })
        }
        onPageSizeChange={(pageSize) =>
          setWarehouseTransferTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const WarehouseTransfersTableV2 = compose(
  withWarehouseTransfersActions,
  withAlertActions,
  withDrawerActions,
  withWarehouseTransfers(({ warehouseTransferTableState }: any) => ({
    warehouseTransferTableState,
  })),
)(WarehouseTransfersTableV2Root);
