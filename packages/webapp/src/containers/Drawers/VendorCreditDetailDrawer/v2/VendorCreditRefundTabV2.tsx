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
import { useRefundVendorCredit } from '@/hooks/query';
import { compose } from '@/utils';

import type { VendorCreditRefundRow } from './types';

interface VendorCreditRefundTabV2Props {
  vendorCreditId: number;
}
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface UseRefundResult {
  data: VendorCreditRefundRow[] | undefined;
  isLoading: boolean;
}

const getRowId = (row: VendorCreditRefundRow) => String(row.id);

function useRefundColumns(onDelete: (row: VendorCreditRefundRow) => void) {
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
        Header: intl.get('refund_vendor_credit.column.amount'),
        align: 'right',
        width: 120,
        Cell: ({ row }: { row: { original: VendorCreditRefundRow } }) => (
          <span className="font-medium">{row.original.formtted_amount}</span>
        ),
      },
      {
        id: 'deposit_account',
        Header: intl.get('refund_vendor_credit.column.withdrawal_account'),
        width: 150,
        Cell: ({ row }: { row: { original: VendorCreditRefundRow } }) => (
          <span>{row.original.deposit_account?.name}</span>
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
        Cell: ({ row }: { row: { original: VendorCreditRefundRow } }) => (
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
 * Вкладка «Возвраты средств» по возврату поставщику.
 */
function VendorCreditRefundTabV2Root({
  vendorCreditId,
  openAlert,
}: VendorCreditRefundTabV2Props & WithAlertActionsProps) {
  const { data, isLoading } = useRefundVendorCredit(
    vendorCreditId,
    { enabled: !!vendorCreditId },
    undefined,
  ) as UseRefundResult;

  const columns = useRefundColumns((row) =>
    openAlert('refund-vendor-delete', { vendorCreditId: row.id }),
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      getRowId={getRowId}
      loading={isLoading}
      emptyState={
        <p className="m-0 rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-muted">
          {intl.get('no_results')}
        </p>
      }
    />
  );
}

export const VendorCreditRefundTabV2 = compose(withAlertActions)(
  VendorCreditRefundTabV2Root,
) as ComponentType<VendorCreditRefundTabV2Props>;
