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
import { VendorAction, AbilitySubject } from '@/constants/abilityOption';

export interface VendorRow {
  id: number;
  display_name: string;
  company_name?: string;
  work_phone?: string;
  note?: string;
  closing_balance: number;
  currency_code: string;
  active: boolean;
}

export interface VendorRowActions {
  onViewDetails: (row: VendorRow) => void;
  onEdit: (row: VendorRow) => void;
  onDuplicate: (row: VendorRow) => void;
  onInactivate: (row: VendorRow) => void;
  onActivate: (row: VendorRow) => void;
  onDelete: (row: VendorRow) => void;
}

/**
 * Меню действий строки поставщика (shadcn DropdownMenu).
 */
export function VendorsActionsMenuV2({
  row,
  actions,
}: {
  row: VendorRow;
  actions: VendorRowActions;
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
        <Can I={VendorAction.Edit} a={AbilitySubject.Vendor}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_vendor')}
          </DropdownMenuItem>
        </Can>
        <Can I={VendorAction.Create} a={AbilitySubject.Vendor}>
          <DropdownMenuItem onClick={() => actions.onDuplicate(row)}>
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('duplicate')}
          </DropdownMenuItem>
        </Can>
        <Can I={VendorAction.Edit} a={AbilitySubject.Vendor}>
          {row.active ? (
            <DropdownMenuItem onClick={() => actions.onInactivate(row)}>
              <Pause className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('inactivate_item')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => actions.onActivate(row)}>
              <Play className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('activate_item')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={VendorAction.Delete} a={AbilitySubject.Vendor}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_vendor')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
