import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Package } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { EntityMobileRow } from '@/components/ui/entity-mobile-row';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, ItemAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useItemsListContext } from '../ItemsListProvider';
import { withItems } from '../withItems';
import { withItemsActions } from '../withItemsActions';
import { useItemsTableColumnsV2 } from './useItemsTableColumnsV2';
import type { ItemRow } from './ItemsActionsMenuV2';

const getItemRowId = (row: ItemRow) => String(row.id);

function ItemsEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<Package className="h-8 w-8" aria-hidden />}
      title={intl.get('manage_the_organization_s_services_and_products')}
      description={intl.get(
        'here_a_list_of_your_organization_products_and_services',
      )}
      action={
        <Can I={ItemAction.Create} a={AbilitySubject.Item}>
          <Button onClick={() => history.push('/items/new')}>
            {intl.get('new_item')}
          </Button>
        </Can>
      }
    />
  );
}

function ItemsTableV2Root({
  // #withItemsActions
  setItemsTableState,
  setItemsSelectedRows,
  // #withItems
  itemsTableState,
  // #withAlertActions
  openAlert,
  // #withDialogActions
  openDialog,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const { isEmptyStatus, items, pagination, isItemsLoading, isItemsFetching } =
    useItemsListContext() as any;

  const columns = useItemsTableColumnsV2({
    onViewDetails: (row) => openDrawer(DRAWERS.ITEM_DETAILS, { itemId: row.id }),
    onEdit: (row) => history.push(`/items/${row.id}/edit`),
    onDuplicate: (row) =>
      history.push(`/items/new?duplicate=${row.id}`, { action: row.id }),
    onInactivate: (row) => openAlert('item-inactivate', { itemId: row.id }),
    onActivate: (row) => openAlert('item-activate', { itemId: row.id }),
    onMakeAdjustment: (row) =>
      openDialog('inventory-adjustment', { itemId: row.id }),
    onDelete: (row) => openAlert('item-delete', { itemId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setItemsTableState({ sortBy });
    },
    [setItemsTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setItemsSelectedRows(ids.map(Number));
    },
    [setItemsSelectedRows],
  );

  if (isEmptyStatus) {
    return <ItemsEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={items ?? []}
        getRowId={getItemRowId}
        loading={isItemsLoading || isItemsFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: ItemRow) =>
          openDrawer(DRAWERS.ITEM_DETAILS, { itemId: row.id })
        }
        renderMobileRow={(row: ItemRow) => (
          <EntityMobileRow
            title={row.name}
            subtitle={row.category?.name || row.type_formatted}
            amount={row.sell_price_formatted}
          />
        )}
        emptyState={<ItemsEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={itemsTableState?.pageIndex ?? 0}
        pageSize={itemsTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setItemsTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setItemsTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const ItemsTableV2 = compose(
  withAlertActions,
  withDialogActions,
  withDrawerActions,
  withItemsActions,
  withItems(({ itemsTableState }: any) => ({ itemsTableState })),
)(ItemsTableV2Root);
