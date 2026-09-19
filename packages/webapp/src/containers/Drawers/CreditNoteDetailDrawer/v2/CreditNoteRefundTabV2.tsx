import { ComponentType, useMemo } from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal, Trash2 } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreditNoteAction, AbilitySubject } from '@/constants/abilityOption';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { useRefundCreditNote } from '@/hooks/query';
import { compose } from '@/utils';

import type { CreditNoteRefundRow } from './types';

interface CreditNoteRefundTabV2Props {
  creditNoteId: number;
}
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface UseRefundResult {
  data: CreditNoteRefundRow[] | undefined;
  isLoading: boolean;
}

const getRowId = (row: CreditNoteRefundRow) => String(row.id);

function useRefundColumns(onDelete: (row: CreditNoteRefundRow) => void) {
  return useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        accessor: 'formatted_date',
        width: 120,
      },
      {
        id: 'amount',
        Header: intl.get('refund_credit_transactions.column.amount_refunded'),
        align: 'right',
        width: 120,
        Cell: ({ row }: { row: { original: CreditNoteRefundRow } }) => (
          <span className="font-medium">{row.original.formtted_amount}</span>
        ),
      },
      {
        id: 'from_account',
        Header: intl.get(
          'refund_credit_transactions.column.withdrawal_account',
        ),
        width: 150,
        Cell: ({ row }: { row: { original: CreditNoteRefundRow } }) => (
          <span>{row.original.from_account?.name}</span>
        ),
      },
      {
        id: 'reference_no',
        Header: intl.get('reference_no'),
        accessor: 'reference_no',
        width: 110,
      },
      {
        id: '__actions__',
        Header: '',
        width: 48,
        Cell: ({ row }: { row: { original: CreditNoteRefundRow } }) => (
          <Can I={CreditNoteAction.Delete} a={AbilitySubject.CreditNote}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={intl.get('more_actions')}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete_transaction')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Can>
        ),
      },
    ],
    [onDelete],
  );
}

/**
 * Вкладка «Возвраты средств» по возврату покупателю.
 */
function CreditNoteRefundTabV2Root({
  creditNoteId,
  openAlert,
}: CreditNoteRefundTabV2Props & WithAlertActionsProps) {
  const { data, isLoading } = useRefundCreditNote(
    creditNoteId,
    { enabled: !!creditNoteId },
    undefined,
  ) as UseRefundResult;

  const columns = useRefundColumns((row) =>
    openAlert('refund-credit-delete', { creditNoteId: row.id }),
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      getRowId={getRowId}
      loading={isLoading}
      emptyState={
        <p className="m-0 rounded-default border border-border bg-surface p-6 text-center text-sm text-text-muted">
          {intl.get('no_results')}
        </p>
      }
    />
  );
}

export const CreditNoteRefundTabV2 = compose(withAlertActions)(
  CreditNoteRefundTabV2Root,
) as ComponentType<CreditNoteRefundTabV2Props>;
