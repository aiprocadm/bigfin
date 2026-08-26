import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Users } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, CustomerAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useCustomersListContext } from '../CustomersListProvider';
import { withCustomers } from '../withCustomers';
import { withCustomersActions } from '../withCustomersActions';
import { useCustomersTableColumnsV2 } from './useCustomersTableColumnsV2';
import type { CustomerRow } from './CustomersActionsMenuV2';

const getCustomerRowId = (row: CustomerRow) => String(row.id);

function CustomersEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<Users className="h-8 w-8" aria-hidden />}
      title={intl.get('create_and_manage_your_organization_s_customers')}
      description={intl.get(
        'customers.empty.description',
      )}
      action={
        <Can I={CustomerAction.Create} a={AbilitySubject.Customer}>
          <Button onClick={() => history.push('/customers/new')}>
            {intl.get('new_customer')}
          </Button>
        </Can>
      }
    />
  );
}

function CustomersTableV2Root({
  // #withCustomersActions
  setCustomersTableState,
  setCustomersSelectedRows,
  // #withCustomers
  customersTableState,
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
    customers,
    pagination,
    isCustomersLoading,
    isCustomersFetching,
  } = useCustomersListContext() as any;

  const columns = useCustomersTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.CUSTOMER_DETAILS, { customerId: row.id }),
    onEdit: (row) => history.push(`/customers/${row.id}/edit`),
    onDuplicate: (row) => openDialog('contact-duplicate', { contactId: row.id }),
    onInactivate: (row) => openAlert('customer-inactivate', { customerId: row.id }),
    onActivate: (row) =>
      openAlert('customer-activate', {
        customerId: row.id,
        service: (row as any).contact_service,
      }),
    onDelete: (row) => openAlert('customer-delete', { contactId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setCustomersTableState({ sortBy });
    },
    [setCustomersTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setCustomersSelectedRows(ids.map(Number));
    },
    [setCustomersSelectedRows],
  );

  if (isEmptyStatus) {
    return <CustomersEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={customers ?? []}
        getRowId={getCustomerRowId}
        loading={isCustomersLoading || isCustomersFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: CustomerRow) =>
          openDrawer(DRAWERS.CUSTOMER_DETAILS, { customerId: row.id })
        }
        emptyState={<CustomersEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={customersTableState?.pageIndex ?? 0}
        pageSize={customersTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setCustomersTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setCustomersTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const CustomersTableV2 = compose(
  withAlertActions,
  withDialogActions,
  withDrawerActions,
  withCustomersActions,
  withCustomers(({ customersTableState }: any) => ({ customersTableState })),
)(CustomersTableV2Root);
