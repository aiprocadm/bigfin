import intl from 'react-intl-universal';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentMadeAction, AbilitySubject } from '@/constants/abilityOption';

export interface PaymentMadeRowActions {
  onViewDetails: (row: PaymentMadeRow) => void;
  onEdit: (row: PaymentMadeRow) => void;
  onDelete: (row: PaymentMadeRow) => void;
}

export interface PaymentMadeRow {
  id: number;
  formatted_payment_date: string;
  payment_number?: string | null;
  reference?: string | null;
  amount: number;
  currency_code: string;
  vendor?: { display_name?: string };
  payment_account?: { name?: string };
}

/**
 * Меню действий строки исходящего платежа (shadcn DropdownMenu).
 */
export function PaymentsMadeActionsMenuV2({
  row,
  actions,
}: {
  row: PaymentMadeRow;
  actions: PaymentMadeRowActions;
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
        <Can I={PaymentMadeAction.Edit} a={AbilitySubject.PaymentMade}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_payment_made')}
          </DropdownMenuItem>
        </Can>
        <Can I={PaymentMadeAction.Delete} a={AbilitySubject.PaymentMade}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_payment_made')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
