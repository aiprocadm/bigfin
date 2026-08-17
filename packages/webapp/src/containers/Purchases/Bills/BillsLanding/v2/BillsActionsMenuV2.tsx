import intl from 'react-intl-universal';
import {
  ArrowRightLeft,
  Banknote,
  Check,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Receipt,
  Trash2,
} from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AbilitySubject,
  BillAction,
  PaymentMadeAction,
} from '@/constants/abilityOption';

export interface BillRowActions {
  onViewDetails: (row: BillRow) => void;
  onEdit: (row: BillRow) => void;
  onDuplicate: (row: BillRow) => void;
  onConvert: (row: BillRow) => void;
  onOpen: (row: BillRow) => void;
  onQuickPayment: (row: BillRow) => void;
  onAllocateLandedCost: (row: BillRow) => void;
  onDelete: (row: BillRow) => void;
}

export interface BillRow {
  id: number;
  bill_number?: string | null;
  reference_no?: string | null;
  formatted_bill_date: string;
  due_date: string;
  vendor?: { display_name?: string };
  total_formatted: string;
  due_amount: number;
  /** Долг, уже отформатированный сервером («10 000,00 ₽»). */
  formatted_due_amount?: string;
  currency_code: string;
  is_open: boolean;
  is_fully_paid: boolean;
  is_partially_paid: boolean;
  is_overdue: boolean;
  overdue_days: number;
  remaining_days: number;
}

/**
 * Меню действий строки счёта поставщика (shadcn DropdownMenu).
 */
export function BillsActionsMenuV2({
  row,
  actions,
}: {
  row: BillRow;
  actions: BillRowActions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={intl.get('more_actions')}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => actions.onViewDetails(row)}>
          <Eye className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('view_details')}
        </DropdownMenuItem>
        <Can I={BillAction.Edit} a={AbilitySubject.Bill}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_bill')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onDuplicate(row)}>
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('bill.duplicate')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onConvert(row)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('bill.convert_to_credit_note')}
          </DropdownMenuItem>
          {!row.is_open && (
            <DropdownMenuItem onClick={() => actions.onOpen(row)}>
              <Check className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('mark_as_open')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={PaymentMadeAction.Create} a={AbilitySubject.PaymentMade}>
          {row.is_open && !row.is_fully_paid && (
            <DropdownMenuItem onClick={() => actions.onQuickPayment(row)}>
              <Banknote className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('add_payment')}
            </DropdownMenuItem>
          )}
        </Can>
        <DropdownMenuItem onClick={() => actions.onAllocateLandedCost(row)}>
          <Receipt className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('allocate_landed_coast')}
        </DropdownMenuItem>
        <Can I={BillAction.Delete} a={AbilitySubject.Bill}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_bill')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
