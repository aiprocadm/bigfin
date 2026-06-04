import * as React from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';
import { customerStatus, formatBalance, isNegativeBalance } from './format';

export interface CustomersColumnHandlers {
  onView: (customer: any) => void;
  onEdit: (customer: any) => void;
  onDelete: (customer: any) => void;
}

export function useCustomersColumns({
  onView,
  onEdit,
  onDelete,
}: CustomersColumnHandlers) {
  return React.useMemo(
    () => [
      {
        id: 'display_name',
        Header: intl.get('display_name'),
        accessor: 'display_name',
      },
      {
        id: 'company_name',
        Header: intl.get('company_name'),
        accessor: 'company_name',
      },
      {
        id: 'work_phone',
        Header: intl.get('phone_number'),
        accessor: 'personal_phone',
        disableSortBy: true,
      },
      {
        id: 'balance',
        Header: intl.get('receivable_balance'),
        accessor: 'closing_balance',
        align: 'right',
        Cell: ({ row: { original } }: any) => (
          <span
            className={cn(
              isNegativeBalance(original.closing_balance) && 'text-danger',
            )}
          >
            {formatBalance(original.closing_balance, original.currency_code)}
          </span>
        ),
      },
      {
        id: 'status',
        Header: intl.get('customers.col.status'),
        accessor: 'active',
        disableSortBy: true,
        Cell: ({ row: { original } }: any) => {
          const st = customerStatus(!!original.active);
          return (
            <Badge variant={st === 'active' ? 'secondary' : 'outline'}>
              {intl.get(`customers.status.${st}`)}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        Header: '',
        disableSortBy: true,
        align: 'right',
        width: 48,
        Cell: ({ row: { original } }: any) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={intl.get('customers.row_actions')}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="rounded-md p-1 text-text-secondary hover:bg-surface-elevated"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => onView(original)}>
                {intl.get('view_details')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(original)}>
                {intl.get('edit_customer')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger"
                onClick={() => onDelete(original)}
              >
                {intl.get('delete_customer')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onView, onEdit, onDelete],
  );
}
