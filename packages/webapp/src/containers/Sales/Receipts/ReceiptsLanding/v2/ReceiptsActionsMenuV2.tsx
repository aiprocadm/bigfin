import intl from 'react-intl-universal';
import {
  CheckCircle2,
  Eye,
  Mail,
  MoreHorizontal,
  Pencil,
  Printer,
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
import { SaleReceiptAction, AbilitySubject } from '@/constants/abilityOption';

export interface ReceiptRowActions {
  onViewDetails: (row: ReceiptRow) => void;
  onEdit: (row: ReceiptRow) => void;
  onClose: (row: ReceiptRow) => void;
  onSendMail: (row: ReceiptRow) => void;
  onPrint: (row: ReceiptRow) => void;
  onDelete: (row: ReceiptRow) => void;
}

export interface ReceiptRow {
  id: number;
  receipt_number?: string;
  formatted_receipt_date?: string;
  reference_no?: string;
  amount: number;
  currency_code: string;
  is_closed: boolean;
  customer?: { display_name?: string };
  deposit_account?: { name?: string };
}

/**
 * Меню действий строки чека (shadcn DropdownMenu).
 */
export function ReceiptsActionsMenuV2({
  row,
  actions,
}: {
  row: ReceiptRow;
  actions: ReceiptRowActions;
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
        <Can I={SaleReceiptAction.Edit} a={AbilitySubject.Receipt}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_receipt')}
          </DropdownMenuItem>
          {!row.is_closed && (
            <DropdownMenuItem onClick={() => actions.onClose(row)}>
              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('mark_as_closed')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={SaleReceiptAction.View} a={AbilitySubject.Receipt}>
          <DropdownMenuItem onClick={() => actions.onSendMail(row)}>
            <Mail className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('send_mail')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onPrint(row)}>
            <Printer className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('print')}
          </DropdownMenuItem>
        </Can>
        <Can I={SaleReceiptAction.Delete} a={AbilitySubject.Receipt}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_receipt')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
