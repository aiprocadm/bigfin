import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { HandCoins } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, PaymentReceiveAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { usePaymentsReceivedListContext } from '../PaymentsReceivedListProvider';
import { withPaymentsReceived } from '../withPaymentsReceived';
import { withPaymentsReceivedActions } from '../withPaymentsReceivedActions';
import { usePaymentsReceivedTableColumnsV2 } from './usePaymentsReceivedTableColumnsV2';
import type { PaymentReceivedRow } from './PaymentsReceivedActionsMenuV2';

const getPaymentReceivedRowId = (row: PaymentReceivedRow) => String(row.id);

function PaymentsReceivedEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<HandCoins className="h-8 w-8" aria-hidden />}
      title={intl.get('the_organization_doesn_t_receive_money_yet')}
      description={intl.get(
        'receiving_customer_payments_is_one_pleasant_accounting_tasks',
      )}
      action={
        <Can I={PaymentReceiveAction.Create} a={AbilitySubject.PaymentReceive}>
          <Button onClick={() => history.push('/payment-received/new')}>
            {intl.get('new_payment_received')}
          </Button>
        </Can>
      }
    />
  );
}

function PaymentsReceivedTableV2Root({
  // #withPaymentsReceivedActions
  setPaymentReceivesTableState,
  setPaymentReceivesSelectedRows,
  // #withPaymentsReceived
  paymentReceivesTableState,
  // #withAlertActions
  openAlert,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const {
    isEmptyStatus,
    paymentReceives,
    pagination,
    isPaymentReceivesLoading,
    isPaymentReceivesFetching,
  } = usePaymentsReceivedListContext() as any;

  const columns = usePaymentsReceivedTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.PAYMENT_RECEIVED_DETAILS, { paymentReceiveId: row.id }),
    onSendMail: (row) =>
      openDrawer(DRAWERS.PAYMENT_RECEIVED_SEND_MAIL, {
        paymentReceivedId: row.id,
      }),
    onEdit: (row) => history.push(`/payments-received/${row.id}/edit`),
    onDelete: (row) =>
      openAlert('payment-received-delete', { paymentReceiveId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setPaymentReceivesTableState({ sortBy });
    },
    [setPaymentReceivesTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setPaymentReceivesSelectedRows(ids.map(Number));
    },
    [setPaymentReceivesSelectedRows],
  );

  if (isEmptyStatus) {
    return <PaymentsReceivedEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={paymentReceives ?? []}
        getRowId={getPaymentReceivedRowId}
        loading={isPaymentReceivesLoading || isPaymentReceivesFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: PaymentReceivedRow) =>
          openDrawer(DRAWERS.PAYMENT_RECEIVED_DETAILS, {
            paymentReceiveId: row.id,
          })
        }
        emptyState={<PaymentsReceivedEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={paymentReceivesTableState?.pageIndex ?? 0}
        pageSize={paymentReceivesTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setPaymentReceivesTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setPaymentReceivesTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const PaymentsReceivedTableV2 = compose(
  withAlertActions,
  withDrawerActions,
  withPaymentsReceivedActions,
  withPaymentsReceived(({ paymentReceivesTableState }: any) => ({
    paymentReceivesTableState,
  })),
)(PaymentsReceivedTableV2Root);
