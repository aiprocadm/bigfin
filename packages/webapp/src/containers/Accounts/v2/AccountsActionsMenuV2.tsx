import intl from 'react-intl-universal';
import {
  Eye,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
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
import { AbilitySubject, AccountAction } from '@/constants/abilityOption';

/** Строка счёта из плана счетов (нужные представлению поля легаси-ответа). */
export interface AccountRow {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  account_type: string;
  account_type_label: string;
  account_normal: string;
  currency_code: string;
  amount: number | null;
  formatted_amount?: string;
  active: boolean;
  children?: AccountRow[];
}

export interface AccountRowActions {
  onViewDetails: (row: AccountRow) => void;
  onEdit: (row: AccountRow) => void;
  onNewChild: (row: AccountRow) => void;
  onActivate: (row: AccountRow) => void;
  onInactivate: (row: AccountRow) => void;
  onDelete: (row: AccountRow) => void;
}

/**
 * Меню действий строки счёта (shadcn DropdownMenu, замена легаси ActionsMenu).
 * Гейты способностей повторяют легаси: все правки (вкл. удаление) — под
 * AccountAction.Edit.
 */
export function AccountsActionsMenuV2({
  row,
  actions,
}: {
  row: AccountRow;
  actions: AccountRowActions;
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
        <Can I={AccountAction.Edit} a={AbilitySubject.Account}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_account')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onNewChild(row)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('new_child_account')}
          </DropdownMenuItem>
        </Can>
        <Can I={AccountAction.Edit} a={AbilitySubject.Account}>
          {row.active ? (
            <DropdownMenuItem onClick={() => actions.onInactivate(row)}>
              <Pause className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('inactivate_account')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => actions.onActivate(row)}>
              <Play className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('activate_account')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={AccountAction.Edit} a={AbilitySubject.Account}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_account')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
