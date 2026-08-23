import intl from 'react-intl-universal';
import {
  Check,
  Eye,
  Mail,
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
import { CreditNoteAction, AbilitySubject } from '@/constants/abilityOption';

export interface CreditNoteRow {
  id: number;
  formatted_credit_note_date: string;
  customer?: { display_name?: string };
  credit_note_number: string;
  formatted_amount: string;
  formatted_credits_remaining: string;
  reference_no?: string;
  is_open: boolean;
  is_closed: boolean;
  is_draft: boolean;
  is_published: boolean;
}

export interface CreditNoteRowActions {
  onViewDetails: (row: CreditNoteRow) => void;
  onEdit: (row: CreditNoteRow) => void;
  onOpen: (row: CreditNoteRow) => void;
  onRefund: (row: CreditNoteRow) => void;
  onReconcile: (row: CreditNoteRow) => void;
  onSendMail: (row: CreditNoteRow) => void;
  onDelete: (row: CreditNoteRow) => void;
}

/**
 * Меню действий строки возврата покупателю (shadcn DropdownMenu).
 */
export function CreditNotesActionsMenuV2({
  row,
  actions,
}: {
  row: CreditNoteRow;
  actions: CreditNoteRowActions;
}) {
  const canRefundOrReconcile = !row.is_closed && row.is_published;
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
        <Can I={CreditNoteAction.Edit} a={AbilitySubject.CreditNote}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('credit_note.action.edit_credit_note')}
          </DropdownMenuItem>
          {row.is_draft && (
            <DropdownMenuItem onClick={() => actions.onOpen(row)}>
              <Check className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('credit_note.action.make_as_open')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={CreditNoteAction.Edit} a={AbilitySubject.CreditNote}>
          {row.is_published && (
            <DropdownMenuItem onClick={() => actions.onSendMail(row)}>
              <Mail className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('credit_note.send_mail')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={CreditNoteAction.Refund} a={AbilitySubject.CreditNote}>
          {canRefundOrReconcile && (
            <DropdownMenuItem onClick={() => actions.onRefund(row)}>
              <Undo2 className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('credit_note.action.refund_credit_note')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={CreditNoteAction.Edit} a={AbilitySubject.CreditNote}>
          {canRefundOrReconcile && (
            <DropdownMenuItem onClick={() => actions.onReconcile(row)}>
              <Receipt className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('credit_note.action.reconcile_with_invoices')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={CreditNoteAction.Delete} a={AbilitySubject.CreditNote}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('credit_note.action.delete_credit_note')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
