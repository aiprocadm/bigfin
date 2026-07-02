import intl from 'react-intl-universal';
import { Eye, Mail, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentReceiveAction, AbilitySubject } from '@/constants/abilityOption';

export interface PaymentReceivedRowActions {
  onViewDetails: (row: PaymentReceivedRow) => void;
  onSendMail: (row: PaymentReceivedRow) => void;
  onEdit: (row: PaymentReceivedRow) => void;
  onDelete: (row: PaymentReceivedRow) => void;
}

export interface PaymentReceivedRow {
  id: number;
  payment_receive_no?: string;
  formatted_payment_date?: string;
  reference_no?: string;
  amount: number;
  currency_code: string;
  customer?: { display_name?: string };
  deposit_account?: { name?: string };
}

/**
 * Меню действий строки входящего платежа (shadcn DropdownMenu).
 */
export function PaymentsReceivedActionsMenuV2({
  row,
  actions,
}: {
  row: PaymentReceivedRow;
  actions: PaymentReceivedRowActions;
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
        <DropdownMenuItem onClick={() => actions.onSendMail(row)}>
          <Mail className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('payment_received.action.send_mail')}
        </DropdownMenuItem>
        <Can I={PaymentReceiveAction.Edit} a={AbilitySubject.PaymentReceive}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_payment_received')}
          </DropdownMenuItem>
        </Can>
        <Can I={PaymentReceiveAction.Delete} a={AbilitySubject.PaymentReceive}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_payment_received')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
