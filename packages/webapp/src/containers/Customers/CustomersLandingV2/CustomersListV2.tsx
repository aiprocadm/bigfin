import React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListView } from '@/components/ui/list-view/list-view';
import { useListController } from '@/components/ui/list-view/use-list-controller';

import { useCustomers } from '@/hooks/query/customers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { DRAWERS } from '@/constants/drawers';
import { compose } from '@/utils';

import { transformCustomersStateToQuery } from '../CustomersLanding/utils';
import { useBulkDeleteCustomersDialog } from '../CustomersLanding/hooks/use-bulk-delete-customers-dialog';
import { useCustomersColumns } from './columns';

const SEARCH_FIELDS = ['display_name', 'company_name', 'personal_phone'];

function CustomersListV2({
  openDrawer,
  openAlert,
}: {
  openDrawer: (name: string, payload?: any) => void;
  openAlert: (name: string, payload?: any) => void;
}) {
  const history = useHistory();
  const { openBulkDeleteDialog } = useBulkDeleteCustomersDialog();

  const openCustomer = React.useCallback(
    (c: any) => openDrawer(DRAWERS.CUSTOMER_DETAILS, { customerId: c.id }),
    [openDrawer],
  );
  const editCustomer = React.useCallback(
    (c: any) => history.push(`/customers/${c.id}/edit`),
    [history],
  );
  const deleteCustomer = React.useCallback(
    (c: any) => openAlert('customer-delete', { contactId: c.id }),
    [openAlert],
  );
  const columns = useCustomersColumns({
    onView: openCustomer,
    onEdit: editCustomer,
    onDelete: deleteCustomer,
  });

  const ctl = useListController({
    transform: transformCustomersStateToQuery,
    searchFields: SEARCH_FIELDS,
  });

  const {
    data: { customers, pagination },
    isFetching,
  } = useCustomers(ctl.query, { keepPreviousData: true });

  const rows = ctl.applySearch(customers);
  const goNew = React.useCallback(() => history.push('/customers/new'), [history]);

  return (
    <ListView
      title={intl.get('customers')}
      primaryAction={{ label: intl.get('new_customer'), onClick: goNew }}
      columns={columns}
      data={rows}
      getRowId={(c) => String(c.id)}
      loading={isFetching}
      search={ctl.search}
      onSearchChange={ctl.setSearch}
      searchPlaceholder={intl.get('customers.search_placeholder')}
      selectedIds={ctl.selected}
      onSelectionChange={ctl.setSelected}
      bulkDelete={{
        label: intl.get('customers.list.bulk_delete'),
        onClick: (ids) => openBulkDeleteDialog(ids.map(Number)),
      }}
      pageIndex={ctl.pageIndex}
      pageSize={ctl.pageSize}
      pageCount={pagination.pagesCount}
      total={pagination.total}
      onPageChange={ctl.onPageChange}
      onPageSizeChange={ctl.onPageSizeChange}
      onSortChange={ctl.setSortBy}
      onRowClick={openCustomer}
      emptyState={
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={intl.get('customers.empty.title')}
          description={intl.get('customers.empty.description')}
          action={
            <Button onClick={goNew}>
              <Plus className="h-4 w-4" />
              {intl.get('new_customer')}
            </Button>
          }
        />
      }
    />
  );
}

const ComposedCustomersListV2 = compose(
  withDrawerActions,
  withAlertActions,
)(CustomersListV2);

export { ComposedCustomersListV2 as CustomersListV2 };
export default ComposedCustomersListV2;
