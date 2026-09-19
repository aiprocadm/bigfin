import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Truck } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { EntityMobileRow } from '@/components/ui/entity-mobile-row';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, VendorAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useVendorsListContext } from '../VendorsListProvider';
import { withVendors } from '../withVendors';
import { withVendorsActions } from '../withVendorsActions';
import { useVendorsTableColumnsV2 } from './useVendorsTableColumnsV2';
import type { VendorRow } from './VendorsActionsMenuV2';

const getVendorRowId = (row: VendorRow) => String(row.id);

function VendorsEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<Truck className="h-8 w-8" aria-hidden />}
      title={intl.get('create_and_manage_your_organization_s_vendors')}
      description={intl.get(
        'vendors.empty.description',
      )}
      action={
        <Can I={VendorAction.Create} a={AbilitySubject.Vendor}>
          <Button onClick={() => history.push('/vendors/new')}>
            {intl.get('new_vendor')}
          </Button>
        </Can>
      }
    />
  );
}

function VendorsTableV2Root({
  // #withVendorsActions
  setVendorsTableState,
  setVendorsSelectedRows,
  // #withVendors
  vendorsTableState,
  // #withAlertActions
  openAlert,
  // #withDialogActions
  openDialog,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const { vendors, pagination, isVendorsFetching, isVendorsLoading, isEmptyStatus } =
    useVendorsListContext() as any;

  const columns = useVendorsTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.VENDOR_DETAILS, { vendorId: row.id }),
    onEdit: (row) => history.push(`/vendors/${row.id}/edit`),
    onDuplicate: (row) => openDialog('contact-duplicate', { contactId: row.id }),
    onInactivate: (row) =>
      openAlert('vendor-inactivate', {
        vendorId: row.id,
        service: (row as any).contact_service,
      }),
    onActivate: (row) =>
      openAlert('vendor-activate', {
        vendorId: row.id,
        service: (row as any).contact_service,
      }),
    onDelete: (row) => openAlert('vendor-delete', { contactId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setVendorsTableState({ sortBy });
    },
    [setVendorsTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setVendorsSelectedRows(ids.map(Number));
    },
    [setVendorsSelectedRows],
  );

  if (isEmptyStatus) {
    return <VendorsEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={vendors ?? []}
        getRowId={getVendorRowId}
        loading={isVendorsLoading || isVendorsFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: VendorRow) =>
          openDrawer(DRAWERS.VENDOR_DETAILS, { vendorId: row.id })
        }
        renderMobileRow={(row: VendorRow) => (
          <EntityMobileRow
            title={row.display_name}
            subtitle={row.company_name || row.work_phone}
            amount={row.closing_balance}
            currency={row.currency_code}
          />
        )}
        emptyState={<VendorsEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={vendorsTableState?.pageIndex ?? 0}
        pageSize={vendorsTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setVendorsTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setVendorsTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const VendorsTableV2 = compose(
  withAlertActions,
  withDialogActions,
  withDrawerActions,
  withVendorsActions,
  withVendors(({ vendorsTableState }: any) => ({ vendorsTableState })),
)(VendorsTableV2Root);
