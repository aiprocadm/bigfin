import intl from 'react-intl-universal';
import {
  Banknote,
  Eye,
  FileMinus,
  Mail,
  MoreHorizontal,
  Pencil,
  Printer,
  Send,
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
  PaymentReceiveAction,
  SaleInvoiceAction,
} from '@/constants/abilityOption';

export interface InvoiceRowActions {
  onViewDetails: (row: InvoiceRow) => void;
  onEdit: (row: InvoiceRow) => void;
  onConvertToCreditNote: (row: InvoiceRow) => void;
  onMarkAsDelivered: (row: InvoiceRow) => void;
  onAddPayment: (row: InvoiceRow) => void;
  onSendMail: (row: InvoiceRow) => void;
  onPrint: (row: InvoiceRow) => void;
  onDelete: (row: InvoiceRow) => void;
}

/** Строка счёта покупателю (snake_case — как отдаёт API списка). */
export interface InvoiceRow {
  id: number;
  invoice_no?: string;
  reference_no?: string;
  invoice_date_formatted?: string;
  due_date_formatted?: string;
  total_formatted?: string;
  due_amount?: number;
  /** Долг, уже отформатированный сервером («20 000,00 ₽»). */
  due_amount_formatted?: string;
  currency_code?: string;
  overdue_days?: number;
  remaining_days?: number;
  is_delivered?: boolean;
  is_overdue?: boolean;
  is_fully_paid?: boolean;
  is_partially_paid?: boolean;
  customer?: { display_name?: string };
}

/**
 * Меню действий строки счёта покупателю (shadcn DropdownMenu).
 * Пункты и условия повторяют легаси ActionsMenu (components.tsx).
 */
export function InvoicesActionsMenuV2({
  row,
  actions,
}: {
  row: InvoiceRow;
  actions: InvoiceRowActions;
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
        <Can I={SaleInvoiceAction.Edit} a={AbilitySubject.Invoice}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_invoice')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onConvertToCreditNote(row)}>
            <FileMinus className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('invoice.convert_to_credit_note')}
          </DropdownMenuItem>
          {!row.is_delivered && (
            <DropdownMenuItem onClick={() => actions.onMarkAsDelivered(row)}>
              <Send className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('mark_as_delivered')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={PaymentReceiveAction.Create} a={AbilitySubject.PaymentReceive}>
          {row.is_delivered && !row.is_fully_paid && (
            <DropdownMenuItem onClick={() => actions.onAddPayment(row)}>
              <Banknote className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('add_payment')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={SaleInvoiceAction.View} a={AbilitySubject.Invoice}>
          <DropdownMenuItem onClick={() => actions.onSendMail(row)}>
            <Mail className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('invoice.action.send_mail')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onPrint(row)}>
            <Printer className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('print')}
          </DropdownMenuItem>
        </Can>
        <Can I={SaleInvoiceAction.Delete} a={AbilitySubject.Invoice}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_invoice')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
