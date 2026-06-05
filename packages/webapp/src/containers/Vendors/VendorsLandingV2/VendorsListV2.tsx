import React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListView } from '@/components/ui/list-view/list-view';
import { useListController } from '@/components/ui/list-view/use-list-controller';

import { useVendors } from '@/hooks/query/vendors';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { DRAWERS } from '@/constants/drawers';
import { compose } from '@/utils';

import { transformVendorsStateToQuery } from '../VendorsLanding/utils';
import { useBulkDeleteVendorsDialog } from '../VendorsLanding/hooks/use-bulk-delete-vendors-dialog';
import { useVendorsColumns } from './columns';

const SEARCH_FIELDS = ['display_name', 'company_name', 'work_phone'];

function VendorsListV2({
  openDrawer,
  openAlert,
}: {
  openDrawer: (name: string, payload?: any) => void;
  openAlert: (name: string, payload?: any) => void;
}) {
  const history = useHistory();
  const { openBulkDeleteDialog } = useBulkDeleteVendorsDialog();

  const openVendor = React.useCallback(
    (v: any) => openDrawer(DRAWERS.VENDOR_DETAILS, { vendorId: v.id }),
    [openDrawer],
  );
  const editVendor = React.useCallback(
    (v: any) => history.push(`/vendors/${v.id}/edit`),
    [history],
  );
  const deleteVendor = React.useCallback(
    (v: any) => openAlert('vendor-delete', { contactId: v.id }),
    [openAlert],
  );
  const columns = useVendorsColumns({
    onView: openVendor,
    onEdit: editVendor,
    onDelete: deleteVendor,
  });

  const ctl = useListController({
    transform: transformVendorsStateToQuery,
    searchFields: SEARCH_FIELDS,
  });

  const {
    data: { vendors, pagination },
    isFetching,
  } = useVendors(ctl.query, { keepPreviousData: true });

  const rows = ctl.applySearch(vendors);
  const goNew = React.useCallback(() => history.push('/vendors/new'), [history]);

  return (
    <ListView
      title={intl.get('vendors')}
      primaryAction={{ label: intl.get('new_vendor'), onClick: goNew }}
      columns={columns}
      data={rows}
      getRowId={(v) => String(v.id)}
      loading={isFetching}
      search={ctl.search}
      onSearchChange={ctl.setSearch}
      searchPlaceholder={intl.get('vendors.search_placeholder')}
      selectedIds={ctl.selected}
      onSelectionChange={ctl.setSelected}
      bulkDelete={{
        label: intl.get('vendors.list.bulk_delete'),
        onClick: (ids) => openBulkDeleteDialog(ids.map(Number)),
      }}
      pageIndex={ctl.pageIndex}
      pageSize={ctl.pageSize}
      pageCount={pagination.pagesCount}
      total={pagination.total}
      onPageChange={ctl.onPageChange}
      onPageSizeChange={ctl.onPageSizeChange}
      onSortChange={ctl.setSortBy}
      onRowClick={openVendor}
      emptyState={
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title={intl.get('vendors.empty.title')}
          description={intl.get('vendors.empty.description')}
          action={
            <Button onClick={goNew}>
              <Plus className="h-4 w-4" />
              {intl.get('new_vendor')}
            </Button>
          }
        />
      }
    />
  );
}

const ComposedVendorsListV2 = compose(
  withDrawerActions,
  withAlertActions,
)(VendorsListV2);

export { ComposedVendorsListV2 as VendorsListV2 };
export default ComposedVendorsListV2;
