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
import { VendorCreditAction, AbilitySubject } from '@/constants/abilityOption';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { useReconcileVendorCredits } from '@/hooks/query';
import { compose } from '@/utils';

import type { VendorCreditReconcileRow } from './types';

interface VendorCreditReconcileTabV2Props {
  vendorCreditId: number;
}
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface UseReconcileResult {
  data: VendorCreditReconcileRow[] | undefined;
  isLoading: boolean;
}

const getRowId = (row: VendorCreditReconcileRow) => String(row.id);

function useReconcileColumns(
  onDelete: (row: VendorCreditReconcileRow) => void,
) {
  return useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        accessor: 'formatted_bill_date',
        width: 120,
      },
      {
        id: 'bill_number',
        Header: intl.get('bill_number'),
        accessor: 'bill_reference_no',
        width: 130,
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 120,
        Cell: ({ row }: { row: { original: VendorCreditReconcileRow } }) => (
          <span className="font-medium">{row.original.formatted_amount}</span>
        ),
      },
      {
        id: '__actions__',
        Header: '',
        width: 48,
        Cell: ({ row }: { row: { original: VendorCreditReconcileRow } }) => (
          <Can I={VendorCreditAction.Delete} a={AbilitySubject.VendorCredit}>
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
 * Вкладка «Сверка со счетами» по возврату поставщику.
 */
function VendorCreditReconcileTabV2Root({
  vendorCreditId,
  openAlert,
}: VendorCreditReconcileTabV2Props & WithAlertActionsProps) {
  const { data, isLoading } = useReconcileVendorCredits(
    vendorCreditId,
    { enabled: !!vendorCreditId },
    undefined,
  ) as UseReconcileResult;

  const columns = useReconcileColumns((row) =>
    openAlert('reconcile-vendor-delete', { vendorCreditId: row.id }),
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

export const VendorCreditReconcileTabV2 = compose(withAlertActions)(
  VendorCreditReconcileTabV2Root,
) as ComponentType<VendorCreditReconcileTabV2Props>;
