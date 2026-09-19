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
import { useReconcileCreditNotes } from '@/hooks/query';
import { compose } from '@/utils';

import type { CreditNoteReconcileRow } from './types';

interface CreditNoteReconcileTabV2Props {
  creditNoteId: number;
}
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface UseReconcileResult {
  data: CreditNoteReconcileRow[] | undefined;
  isLoading: boolean;
}

const getRowId = (row: CreditNoteReconcileRow) => String(row.id);

function useReconcileColumns(onDelete: (row: CreditNoteReconcileRow) => void) {
  return useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        accessor: 'formatted_credit_note_date',
        width: 120,
      },
      {
        id: 'invoice_no',
        Header: intl.get('invoice_no'),
        accessor: 'invoice_number',
        width: 130,
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 120,
        Cell: ({ row }: { row: { original: CreditNoteReconcileRow } }) => (
          <span className="font-medium">{row.original.formtted_amount}</span>
        ),
      },
      {
        id: '__actions__',
        Header: '',
        width: 48,
        Cell: ({ row }: { row: { original: CreditNoteReconcileRow } }) => (
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
 * Вкладка «Сверка со счетами» по возврату покупателю.
 */
function CreditNoteReconcileTabV2Root({
  creditNoteId,
  openAlert,
}: CreditNoteReconcileTabV2Props & WithAlertActionsProps) {
  const { data, isLoading } = useReconcileCreditNotes(
    creditNoteId,
    { enabled: !!creditNoteId },
    undefined,
  ) as UseReconcileResult;

  const columns = useReconcileColumns((row) =>
    openAlert('reconcile-credit-delete', { creditNoteId: row.id }),
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

export const CreditNoteReconcileTabV2 = compose(withAlertActions)(
  CreditNoteReconcileTabV2Root,
) as ComponentType<CreditNoteReconcileTabV2Props>;
