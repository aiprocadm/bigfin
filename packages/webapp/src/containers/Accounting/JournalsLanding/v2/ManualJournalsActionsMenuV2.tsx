import intl from 'react-intl-universal';
import { Eye, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react';

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
  ManualJournalAction,
  AbilitySubject,
} from '@/constants/abilityOption';

export interface ManualJournalRow {
  id: number;
  formatted_date: string;
  amount_formatted: string;
  journal_number: string | number;
  journal_type?: string;
  description?: string;
  formatted_created_at?: string;
  is_published: boolean;
}

export interface ManualJournalRowActions {
  onViewDetails: (row: ManualJournalRow) => void;
  onPublish: (row: ManualJournalRow) => void;
  onEdit: (row: ManualJournalRow) => void;
  onDelete: (row: ManualJournalRow) => void;
}

/**
 * Меню действий строки проводки (shadcn DropdownMenu).
 */
export function ManualJournalsActionsMenuV2({
  row,
  actions,
}: {
  row: ManualJournalRow;
  actions: ManualJournalRowActions;
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
        <Can I={ManualJournalAction.Edit} a={AbilitySubject.ManualJournal}>
          <DropdownMenuSeparator />
          {!row.is_published && (
            <DropdownMenuItem onClick={() => actions.onPublish(row)}>
              <Send className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('publish_journal')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_journal')}
          </DropdownMenuItem>
        </Can>
        <Can I={ManualJournalAction.Delete} a={AbilitySubject.ManualJournal}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_journal')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
