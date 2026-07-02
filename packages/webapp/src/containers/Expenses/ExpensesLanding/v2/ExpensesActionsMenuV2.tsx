import intl from 'react-intl-universal';
import { ArrowUpToLine, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExpenseAction, AbilitySubject } from '@/constants/abilityOption';

export interface ExpenseCategoryRow {
  expense_account?: { name?: string };
}

export interface ExpenseRow {
  id: number;
  formatted_date: string;
  formatted_amount: string;
  payment_account?: { name?: string };
  categories: ExpenseCategoryRow[];
  is_published: boolean;
  description?: string;
}

export interface ExpenseRowActions {
  onViewDetails: (row: ExpenseRow) => void;
  onPublish: (row: ExpenseRow) => void;
  onEdit: (row: ExpenseRow) => void;
  onDelete: (row: ExpenseRow) => void;
}

/**
 * Меню действий строки расхода (shadcn DropdownMenu).
 */
export function ExpensesActionsMenuV2({
  row,
  actions,
}: {
  row: ExpenseRow;
  actions: ExpenseRowActions;
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
        <Can I={ExpenseAction.Edit} a={AbilitySubject.Expense}>
          <DropdownMenuSeparator />
          {!row.is_published && (
            <DropdownMenuItem onClick={() => actions.onPublish(row)}>
              <ArrowUpToLine className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('publish_expense')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_expense')}
          </DropdownMenuItem>
        </Can>
        <Can I={ExpenseAction.Delete} a={AbilitySubject.Expense}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_expense')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
