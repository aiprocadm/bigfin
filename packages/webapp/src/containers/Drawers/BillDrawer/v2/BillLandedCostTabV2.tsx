import { ComponentType, useMemo } from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useBillLocatedLandedCost } from '@/hooks/query';
import { compose } from '@/utils';

import type { BillLandedCostTransaction } from './types';

interface BillLandedCostTabV2Props {
  billId: number;
}

// Легаси-HOC'и без типов: описываем инжектируемые пропсы локально.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  openDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

// useBillLocatedLandedCost — легаси react-query хук без типов.
interface UseBillLocatedLandedCostResult {
  data: BillLandedCostTransaction[];
  isLoading: boolean;
}

const getLandedCostRowId = (row: BillLandedCostTransaction) => String(row.id);

interface LandedCostRowActions {
  onDelete: (row: BillLandedCostTransaction) => void;
  onFromTransactionClick: (row: BillLandedCostTransaction) => void;
}

function useLandedCostColumnsV2(actions: LandedCostRowActions) {
  return useMemo(
    () => [
      {
        id: 'name',
        Header: intl.get('name'),
        width: 160,
        Cell: ({ row }: { row: { original: BillLandedCostTransaction } }) => (
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{row.original.name}</span>
            {row.original.description ? (
              <span className="text-xs text-text-muted">
                {row.original.description}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 110,
        Cell: ({ row }: { row: { original: BillLandedCostTransaction } }) => (
          <span className="font-medium">{row.original.formatted_amount}</span>
        ),
      },
      {
        id: 'from_transaction',
        Header: intl.get('From transaction'),
        width: 130,
        Cell: ({ row }: { row: { original: BillLandedCostTransaction } }) => (
          <button
            type="button"
            className="text-action underline-offset-4 hover:underline"
            onClick={() => actions.onFromTransactionClick(row.original)}
          >
            {row.original.from_transaction_type} →{' '}
            {row.original.from_transaction_id}
          </button>
        ),
      },
      {
        id: 'allocation_method',
        Header: intl.get('allocation_method'),
        accessor: 'allocation_method_formatted',
        width: 120,
      },
      {
        id: '__actions__',
        Header: '',
        width: 48,
        Cell: ({ row }: { row: { original: BillLandedCostTransaction } }) => (
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
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onClick={() => actions.onDelete(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('delete_transaction')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [actions],
  );
}

/**
 * Вкладка «Распределённые накладные расходы»: список распределений
 * с переходом к исходной операции и удалением (как в легаси).
 */
function BillLandedCostTabV2Root({
  billId,
  openAlert,
  openDrawer,
}: BillLandedCostTabV2Props &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  const { data, isLoading } = useBillLocatedLandedCost(billId, {
    enabled: !!billId,
  }) as UseBillLocatedLandedCostResult;

  const columns = useLandedCostColumnsV2({
    // Имя алерта и форма payload (BillId) — как в легаси.
    onDelete: (row) => openAlert('bill-located-cost-delete', { BillId: row.id }),
    onFromTransactionClick: (row) => {
      switch (row.from_transaction_type) {
        case 'Expense':
          openDrawer(DRAWERS.EXPENSE_DETAILS, {
            expenseId: row.from_transaction_id,
          });
          break;
        case 'Bill':
        default:
          openDrawer(DRAWERS.BILL_DETAILS, {
            billId: row.from_transaction_id,
          });
          break;
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      getRowId={getLandedCostRowId}
      loading={isLoading}
      emptyState={
        <p className="m-0 rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-muted">
          {intl.get('no_results')}
        </p>
      }
    />
  );
}

export const BillLandedCostTabV2 = compose(
  withAlertActions,
  withDrawerActions,
)(BillLandedCostTabV2Root) as ComponentType<BillLandedCostTabV2Props>;
