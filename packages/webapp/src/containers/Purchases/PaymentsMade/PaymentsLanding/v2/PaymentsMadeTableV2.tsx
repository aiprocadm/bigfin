import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Wallet } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, PaymentMadeAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { usePaymentMadesListContext } from '../PaymentMadesListProvider';
import { withPaymentMade } from '../withPaymentMade';
import { withPaymentMadeActions } from '../withPaymentMadeActions';
import { usePaymentsMadeTableColumnsV2 } from './usePaymentsMadeTableColumnsV2';
import type { PaymentMadeRow } from './PaymentsMadeActionsMenuV2';

const getPaymentMadeRowId = (row: PaymentMadeRow) => String(row.id);

function PaymentsMadeEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<Wallet className="h-8 w-8" aria-hidden />}
      title={intl.get('payment_made.empty_status.title')}
      description={intl.get('payment_made_empty_status_description')}
      action={
        <Can I={PaymentMadeAction.Create} a={AbilitySubject.PaymentMade}>
          <Button onClick={() => history.push('/payments-made/new')}>
            {intl.get('new_payment_made')}
          </Button>
        </Can>
      }
    />
  );
}

function PaymentsMadeTableV2Root({
  // #withPaymentMadeActions
  setPaymentMadesTableState,
  // #withPaymentMade
  paymentMadesTableState,
  // #withAlertActions
  openAlert,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const {
    isEmptyStatus,
    paymentMades,
    pagination,
    isPaymentsLoading,
    isPaymentsFetching,
  } = usePaymentMadesListContext() as any;

  const columns = usePaymentsMadeTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.PAYMENT_MADE_DETAILS, { paymentMadeId: row.id }),
    onEdit: (row) => history.push(`/payments-made/${row.id}/edit`),
    onDelete: (row) =>
      openAlert('payment-made-delete', { paymentMadeId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setPaymentMadesTableState({ sortBy });
    },
    [setPaymentMadesTableState],
  );

  if (isEmptyStatus) {
    return <PaymentsMadeEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={paymentMades ?? []}
        getRowId={getPaymentMadeRowId}
        loading={isPaymentsLoading || isPaymentsFetching}
        onSortChange={handleSortChange}
        onRowClick={(row: PaymentMadeRow) =>
          openDrawer(DRAWERS.PAYMENT_MADE_DETAILS, { paymentMadeId: row.id })
        }
        emptyState={<PaymentsMadeEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={paymentMadesTableState?.pageIndex ?? 0}
        pageSize={paymentMadesTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setPaymentMadesTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setPaymentMadesTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const PaymentsMadeTableV2 = compose(
  withAlertActions,
  withDrawerActions,
  withPaymentMadeActions,
  withPaymentMade(({ paymentMadesTableState }: any) => ({
    paymentMadesTableState,
  })),
)(PaymentsMadeTableV2Root);
