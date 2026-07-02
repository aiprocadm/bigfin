import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  MoreHorizontal,
  Pencil,
  Printer,
  Receipt,
  Trash2,
  Undo2,
} from 'lucide-react';

import { Can } from '@/components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreditNoteAction, AbilitySubject } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import type { CreditNoteDetail } from './types';

interface CreditNoteDetailHeaderV2Props {
  creditNote: CreditNoteDetail;
  creditNoteId: number;
}

interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDialogActionsProps {
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

function StatusBadge({ creditNote }: { creditNote: CreditNoteDetail }) {
  if (creditNote.is_open) {
    return <Badge variant="secondary">{intl.get('open')}</Badge>;
  }
  if (creditNote.is_closed) {
    return <Badge variant="success">{intl.get('closed')}</Badge>;
  }
  return <Badge variant="outline">{intl.get('draft')}</Badge>;
}

/**
 * Шапка деталей возврата покупателю: номер + статус + «Редактировать» + «⋯»
 * (возврат средств / печать / сверка / удалить) — паритет с легаси actions-bar.
 */
function CreditNoteDetailHeaderV2Root({
  creditNote,
  creditNoteId,
  openAlert,
  openDialog,
  closeDrawer,
}: CreditNoteDetailHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();

  const handleEdit = () => {
    history.push(`/credit-notes/${creditNoteId}/edit`);
    closeDrawer(DRAWERS.CREDIT_NOTE_DETAILS);
  };
  const handleRefund = () => openDialog('refund-credit-note', { creditNoteId });
  const handlePrint = () =>
    openDialog('credit-note-pdf-preview', { creditNoteId });
  const handleReconcile = () =>
    openDialog('reconcile-credit-note', { creditNoteId });
  const handleDelete = () =>
    openAlert('credit-note-delete', { creditNoteId });

  const canRefund = !creditNote.is_closed && !creditNote.is_draft;
  const canReconcile = creditNote.is_published && !creditNote.is_closed;

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('credit_note.drawer.title', {
            number: creditNote.credit_note_number,
          })}
        </DrawerTitle>

        <StatusBadge creditNote={creditNote} />

        <span className="ml-auto flex items-center gap-2">
          <Can I={CreditNoteAction.Edit} a={AbilitySubject.CreditNote}>
            <Button variant="secondary" size="sm" onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('credit_note.action.edit_credit_note')}
            </Button>
          </Can>

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
              <Can I={CreditNoteAction.Refund} a={AbilitySubject.CreditNote}>
                {canRefund ? (
                  <DropdownMenuItem onClick={handleRefund}>
                    <Undo2 className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('refund')}
                  </DropdownMenuItem>
                ) : null}
              </Can>
              <Can I={CreditNoteAction.View} a={AbilitySubject.CreditNote}>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('print')}
                </DropdownMenuItem>
              </Can>
              <Can I={CreditNoteAction.Edit} a={AbilitySubject.CreditNote}>
                {canReconcile ? (
                  <DropdownMenuItem onClick={handleReconcile}>
                    <Receipt className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('credit_note.action.reconcile_with_invoices')}
                  </DropdownMenuItem>
                ) : null}
              </Can>
              <Can I={CreditNoteAction.Delete} a={AbilitySubject.CreditNote}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>
    </DrawerHeader>
  );
}

export const CreditNoteDetailHeaderV2 = compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(CreditNoteDetailHeaderV2Root) as ComponentType<CreditNoteDetailHeaderV2Props>;
