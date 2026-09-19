import intl from 'react-intl-universal';
import { PackageSearch } from 'lucide-react';

import { DataTable } from '@/components/ui/data-table';
import { DocumentMobileRow } from '@/components/ui/document-mobile-row';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useInventoryAdjustmentsContext } from '../InventoryAdjustmentsProvider';
import { withInventoryAdjustments } from '../withInventoryAdjustments';
import { withInventoryAdjustmentActions } from '../withInventoryAdjustmentActions';
import { useInventoryAdjustmentsColumnsV2 } from './useInventoryAdjustmentsColumnsV2';
import type { InventoryAdjustmentRow } from './InventoryAdjustmentsActionsMenuV2';

const getRowId = (row: InventoryAdjustmentRow) => String(row.id);

function InventoryAdjustmentTableV2Root({
  // #withInventoryAdjustmentActions
  setInventoryAdjustmentTableState,
  // #withInventoryAdjustments
  inventoryAdjustmentTableState,
  // #withAlertActions
  openAlert,
  // #withDrawerActions
  openDrawer,
}: any) {
  const { isAdjustmentsLoading, isAdjustmentsFetching, inventoryAdjustments, pagination } =
    useInventoryAdjustmentsContext() as any;

  const columns = useInventoryAdjustmentsColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.INVENTORY_ADJUSTMENT_DETAILS, { inventoryId: row.id }),
    onPublish: (row) =>
      openAlert('inventory-adjustment-publish', { inventoryId: row.id }),
    onDelete: (row) =>
      openAlert('inventory-adjustment-delete', { inventoryId: row.id }),
  });

  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={inventoryAdjustments ?? []}
        getRowId={getRowId}
        loading={isAdjustmentsLoading || isAdjustmentsFetching}
        onRowClick={(row: InventoryAdjustmentRow) =>
          openDrawer(DRAWERS.INVENTORY_ADJUSTMENT_DETAILS, { inventoryId: row.id })
        }
        renderMobileRow={(row: InventoryAdjustmentRow) => (
          <DocumentMobileRow
            title={row.reason || row.formatted_type}
            number={row.reference_no}
            date={row.date}
          />
        )}
        emptyState={
          <EmptyState
            icon={<PackageSearch className="h-8 w-8" aria-hidden />}
            title={intl.get(
              'there_is_no_inventory_adjustments_transactions_yet',
            )}
          />
        }
      />
      <DataTablePagination
        pageIndex={inventoryAdjustmentTableState?.pageIndex ?? 0}
        pageSize={inventoryAdjustmentTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) =>
          setInventoryAdjustmentTableState({ pageIndex })
        }
        onPageSizeChange={(pageSize) =>
          setInventoryAdjustmentTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const InventoryAdjustmentTableV2 = compose(
  withAlertActions,
  withInventoryAdjustmentActions,
  withDrawerActions,
  withInventoryAdjustments(({ inventoryAdjustmentTableState }: any) => ({
    inventoryAdjustmentTableState,
  })),
)(InventoryAdjustmentTableV2Root);
