import React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Plus, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';

import { useCustomers } from '@/hooks/query/customers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { DRAWERS } from '@/constants/drawers';
import { compose } from '@/utils';

import { transformCustomersStateToQuery } from '../CustomersLanding/utils';
import { useBulkDeleteCustomersDialog } from '../CustomersLanding/hooks/use-bulk-delete-customers-dialog';
import { useCustomersColumns } from './columns';

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

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);
  const [sortBy, setSortBy] = React.useState<{ id: string; desc: boolean }[]>([]);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>([]);

  const query = React.useMemo(
    () =>
      transformCustomersStateToQuery({
        pageIndex,
        pageSize,
        sortBy,
        inactiveMode: false,
      }),
    [pageIndex, pageSize, sortBy],
  );

  const {
    data: { customers, pagination },
    isFetching,
  } = useCustomers(query, { keepPreviousData: true });

  // Клиентский поиск по загруженной странице (серверный — follow-up к паритету).
  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c: any) =>
      [c.display_name, c.company_name, c.personal_phone]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const goNew = () => history.push('/customers/new');

  return (
    <div className="bigfin-ui light min-h-full bg-background p-6">
      <PageHeader
        title={intl.get('customers')}
        action={
          <Button onClick={goNew}>
            <Plus className="h-4 w-4" />
            {intl.get('new_customer')}
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={intl.get('customers.search_placeholder')}
        selectedCount={selected.length}
        bulkActions={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openBulkDeleteDialog(selected.map(Number))}
          >
            <Trash2 className="h-4 w-4" />
            {intl.get('customers.list.bulk_delete')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(c) => String(c.id)}
        loading={isFetching}
        enableSelection
        selectedIds={selected}
        onSelectionChange={setSelected}
        onSortChange={setSortBy}
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

      <DataTablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pagination.pagesCount}
        total={pagination.total}
        onPageChange={setPageIndex}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPageIndex(0);
        }}
      />
    </div>
  );
}

const ComposedCustomersListV2 = compose(
  withDrawerActions,
  withAlertActions,
)(CustomersListV2);

export { ComposedCustomersListV2 as CustomersListV2 };
export default ComposedCustomersListV2;
