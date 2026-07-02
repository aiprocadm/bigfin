import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Can } from '@/components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExpenseAction, AbilitySubject } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import type { ExpenseDetail } from './types';

interface ExpenseDrawerHeaderV2Props {
  expense: ExpenseDetail;
  expenseId: number;
}

interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Шапка деталей расхода: заголовок + статус-пилюля + «Редактировать» + «⋯».
 */
function ExpenseDrawerHeaderV2Root({
  expense,
  expenseId,
  openAlert,
  closeDrawer,
}: ExpenseDrawerHeaderV2Props &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();

  const handleEdit = () => {
    history.push(`/expenses/${expenseId}/edit`);
    closeDrawer(DRAWERS.EXPENSE_DETAILS);
  };
  const handleDelete = () => {
    openAlert('expense-delete', { expenseId });
  };

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('expense.drawer.title')}
        </DrawerTitle>

        <Badge variant={expense.is_published ? 'success' : 'outline'}>
          {intl.get(expense.is_published ? 'published' : 'draft')}
        </Badge>

        <span className="ml-auto flex items-center gap-2">
          <Can I={ExpenseAction.Edit} a={AbilitySubject.Expense}>
            <Button variant="secondary" size="sm" onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('edit_expense')}
            </Button>
          </Can>
          <Can I={ExpenseAction.Delete} a={AbilitySubject.Expense}>
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
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Can>
        </span>
      </div>
    </DrawerHeader>
  );
}

export const ExpenseDrawerHeaderV2 = compose(
  withDrawerActions,
  withAlertActions,
)(ExpenseDrawerHeaderV2Root) as ComponentType<ExpenseDrawerHeaderV2Props>;
