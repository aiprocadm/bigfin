import { ComponentType, useMemo } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AbilitySubject,
  PaymentReceiveAction,
} from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useInvoicePaymentTransactions } from '@/hooks/query';
import { compose } from '@/utils';

import type { InvoicePaymentTransaction } from './types';

interface InvoicePaymentTransactionsTabV2Props {
  invoiceId: number;
}

// Легаси-HOC'и без типов: описываем инжектируемые пропсы локально.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

// useInvoicePaymentTransactions — легаси react-query хук без типов.
interface UseInvoicePaymentTransactionsResult {
  data: InvoicePaymentTransaction[];
  isLoading: boolean;
  isFetching: boolean;
}

type PaymentRow = InvoicePaymentTransaction & { __rowId: string };

const getPaymentRowId = (row: PaymentRow) => row.__rowId;

interface PaymentRowActions {
  onEdit: (row: PaymentRow) => void;
  onDelete: (row: PaymentRow) => void;
}

/** Меню действий строки платежа (те же действия, что в легаси ContextMenu). */
function PaymentActionsMenuV2({
  row,
  actions,
}: {
  row: PaymentRow;
  actions: PaymentRowActions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-8 sm:w-8"
          aria-label={intl.get('more_actions')}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Can I={PaymentReceiveAction.Edit} a={AbilitySubject.PaymentReceive}>
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('invoice_transactions.action.edit_transaction')}
          </DropdownMenuItem>
        </Can>
        <Can I={PaymentReceiveAction.Delete} a={AbilitySubject.PaymentReceive}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('invoice_transactions.action.delete_transaction')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function usePaymentColumnsV2(actions: PaymentRowActions) {
  return useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('payment_date'),
        width: 110,
        Cell: ({ row }: { row: { original: PaymentRow } }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.formatted_payment_date}
          </span>
        ),
      },
      {
        id: 'deposit_account_name',
        Header: intl.get('invoice_transactions.column.withdrawal_account'),
        accessor: 'deposit_account_name',
        width: 140,
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 110,
        Cell: ({ row }: { row: { original: PaymentRow } }) => (
          <span className="font-medium">
            {row.original.formatted_payment_amount}
          </span>
        ),
      },
      {
        id: 'payment_number',
        Header: intl.get('payment_no'),
        accessor: 'payment_number',
        width: 100,
      },
      {
        id: 'reference',
        Header: intl.get('reference_no'),
        accessor: 'payment_reference_no',
        width: 90,
      },
      {
        id: '__actions__',
        Header: '',
        width: 48,
        Cell: ({ row }: { row: { original: PaymentRow } }) => (
          <PaymentActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}

/**
 * Вкладка «Операции по платежам»: платежи по счёту покупателю
 * с действиями «редактировать/удалить» (как в легаси ContextMenu).
 */
function InvoicePaymentTransactionsTabV2Root({
  invoiceId,
  openAlert,
  closeDrawer,
}: InvoicePaymentTransactionsTabV2Props &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();

  const { data, isLoading, isFetching } = useInvoicePaymentTransactions(
    invoiceId,
    { enabled: !!invoiceId },
  ) as UseInvoicePaymentTransactionsResult;

  const rows = useMemo<PaymentRow[]>(
    () =>
      (data ?? []).map((transaction, index) => ({
        ...transaction,
        __rowId:
          transaction.payment_receive_id != null
            ? String(transaction.payment_receive_id)
            : `row-${index}`,
      })),
    [data],
  );

  const columns = usePaymentColumnsV2({
    onEdit: (row) => {
      history.push(`/payments-received/${row.payment_receive_id}/edit`);
      closeDrawer(DRAWERS.INVOICE_DETAILS);
    },
    onDelete: (row) => {
      openAlert('payment-received-delete', {
        paymentReceiveId: row.payment_receive_id,
      });
    },
  });

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={getPaymentRowId}
      loading={isLoading || isFetching}
      emptyState={
        <p className="m-0 rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-muted">
          {intl.get('no_results')}
        </p>
      }
    />
  );
}

export const InvoicePaymentTransactionsTabV2 = compose(
  withAlertActions,
  withDrawerActions,
)(InvoicePaymentTransactionsTabV2Root) as ComponentType<InvoicePaymentTransactionsTabV2Props>;
