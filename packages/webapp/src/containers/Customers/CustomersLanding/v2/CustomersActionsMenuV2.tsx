import intl from 'react-intl-universal';
import {
  Copy,
  Eye,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
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
import { CustomerAction, AbilitySubject } from '@/constants/abilityOption';

export interface CustomerRowActions {
  onViewDetails: (row: CustomerRow) => void;
  onEdit: (row: CustomerRow) => void;
  onDuplicate: (row: CustomerRow) => void;
  onInactivate: (row: CustomerRow) => void;
  onActivate: (row: CustomerRow) => void;
  onDelete: (row: CustomerRow) => void;
}

export interface CustomerRow {
  id: number;
  display_name: string;
  company_name?: string;
  personal_phone?: string;
  note?: string;
  closing_balance: number;
  currency_code: string;
  active: boolean;
}

/**
 * Меню действий строки клиента (shadcn DropdownMenu).
 */
export function CustomersActionsMenuV2({
  row,
  actions,
}: {
  row: CustomerRow;
  actions: CustomerRowActions;
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
        <Can I={CustomerAction.Edit} a={AbilitySubject.Customer}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_customer')}
          </DropdownMenuItem>
        </Can>
        <Can I={CustomerAction.Create} a={AbilitySubject.Customer}>
          <DropdownMenuItem onClick={() => actions.onDuplicate(row)}>
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('duplicate')}
          </DropdownMenuItem>
        </Can>
        <Can I={CustomerAction.Edit} a={AbilitySubject.Customer}>
          {row.active ? (
            <DropdownMenuItem onClick={() => actions.onInactivate(row)}>
              <Pause className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('inactivate_customer')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => actions.onActivate(row)}>
              <Play className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('activate_customer')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={CustomerAction.Delete} a={AbilitySubject.Customer}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_customer')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
