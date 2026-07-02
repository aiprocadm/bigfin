import intl from 'react-intl-universal';
import {
  Check,
  Eye,
  MoreHorizontal,
  Pencil,
  Receipt,
  Trash2,
  Undo2,
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
import { VendorCreditAction, AbilitySubject } from '@/constants/abilityOption';

export interface VendorCreditRow {
  id: number;
  formatted_vendor_credit_date: string;
  vendor?: { display_name?: string };
  vendor_credit_number: string;
  formatted_amount: string;
  formatted_credits_remaining: string;
  reference_no?: string;
  is_open: boolean;
  is_closed: boolean;
  is_draft: boolean;
  is_published: boolean;
}

export interface VendorCreditRowActions {
  onViewDetails: (row: VendorCreditRow) => void;
  onEdit: (row: VendorCreditRow) => void;
  onOpen: (row: VendorCreditRow) => void;
  onRefund: (row: VendorCreditRow) => void;
  onReconcile: (row: VendorCreditRow) => void;
  onDelete: (row: VendorCreditRow) => void;
}

/**
 * Меню действий строки возврата поставщику (shadcn DropdownMenu).
 */
export function VendorsCreditNotesActionsMenuV2({
  row,
  actions,
}: {
  row: VendorCreditRow;
  actions: VendorCreditRowActions;
}) {
  const canRefund = !row.is_closed && row.is_published;
  const canReconcile = !row.is_draft && !row.is_closed && row.is_published;
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
        <Can I={VendorCreditAction.Edit} a={AbilitySubject.VendorCredit}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('vendor_credits.action.edit_vendor_credit')}
          </DropdownMenuItem>
          {row.is_draft && (
            <DropdownMenuItem onClick={() => actions.onOpen(row)}>
              <Check className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('vendor_credits.action.mark_as_open')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={VendorCreditAction.Refund} a={AbilitySubject.VendorCredit}>
          {canRefund && (
            <DropdownMenuItem onClick={() => actions.onRefund(row)}>
              <Undo2 className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('vendor_credits.action.refund_vendor_credit')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={VendorCreditAction.Edit} a={AbilitySubject.VendorCredit}>
          {canReconcile && (
            <DropdownMenuItem onClick={() => actions.onReconcile(row)}>
              <Receipt className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('vendor_credits.action.reconcile_with_bills')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={VendorCreditAction.Delete} a={AbilitySubject.VendorCredit}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('vendor_credits.action.delete_vendor_credit')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
