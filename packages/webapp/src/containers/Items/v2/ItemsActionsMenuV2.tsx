import intl from 'react-intl-universal';
import {
  ArrowDownUp,
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
import {
  AbilitySubject,
  InventoryAdjustmentAction,
  ItemAction,
} from '@/constants/abilityOption';

export interface ItemRowActions {
  onViewDetails: (row: ItemRow) => void;
  onEdit: (row: ItemRow) => void;
  onDuplicate: (row: ItemRow) => void;
  onInactivate: (row: ItemRow) => void;
  onActivate: (row: ItemRow) => void;
  onMakeAdjustment: (row: ItemRow) => void;
  onDelete: (row: ItemRow) => void;
}

export interface ItemRow {
  id: number;
  name: string;
  code?: string;
  type?: 'service' | 'non-inventory' | 'inventory' | string;
  type_formatted?: string;
  category?: { name?: string } | null;
  sell_price_formatted?: string;
  cost_price_formatted?: string;
  quantity_on_hand?: number | null;
  active: boolean;
}

/**
 * Меню действий строки товара/услуги (shadcn DropdownMenu).
 */
export function ItemsActionsMenuV2({
  row,
  actions,
}: {
  row: ItemRow;
  actions: ItemRowActions;
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
        <Can I={ItemAction.Edit} a={AbilitySubject.Item}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_item')}
          </DropdownMenuItem>
        </Can>
        <Can I={ItemAction.Create} a={AbilitySubject.Item}>
          <DropdownMenuItem onClick={() => actions.onDuplicate(row)}>
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('duplicate')}
          </DropdownMenuItem>
        </Can>
        <Can I={ItemAction.Edit} a={AbilitySubject.Item}>
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
        <Can
          I={InventoryAdjustmentAction.Edit}
          a={AbilitySubject.InventoryAdjustment}
        >
          {row.type === 'inventory' && (
            <DropdownMenuItem onClick={() => actions.onMakeAdjustment(row)}>
              <ArrowDownUp className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('make_adjustment')}
            </DropdownMenuItem>
          )}
        </Can>
        <Can I={ItemAction.Delete} a={AbilitySubject.Item}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_item')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
