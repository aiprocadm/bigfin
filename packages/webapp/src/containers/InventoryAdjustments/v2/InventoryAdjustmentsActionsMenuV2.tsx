import intl from 'react-intl-universal';
import { ArrowUpToLine, Eye, MoreHorizontal, Trash2 } from 'lucide-react';

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
  InventoryAdjustmentAction,
  AbilitySubject,
} from '@/constants/abilityOption';

export interface InventoryAdjustmentRow {
  id: number;
  date: string;
  created_at: string;
  formatted_type?: string;
  reason?: string;
  reference_no?: string;
  is_published: boolean;
}

export interface InventoryAdjustmentRowActions {
  onViewDetails: (row: InventoryAdjustmentRow) => void;
  onPublish: (row: InventoryAdjustmentRow) => void;
  onDelete: (row: InventoryAdjustmentRow) => void;
}

/**
 * Меню действий строки инвентаризации (shadcn DropdownMenu).
 */
export function InventoryAdjustmentsActionsMenuV2({
  row,
  actions,
}: {
  row: InventoryAdjustmentRow;
  actions: InventoryAdjustmentRowActions;
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
        <Can
          I={InventoryAdjustmentAction.Create}
          a={AbilitySubject.InventoryAdjustment}
        >
          {!row.is_published && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onPublish(row)}>
                <ArrowUpToLine className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('publish_adjustment')}
              </DropdownMenuItem>
            </>
          )}
        </Can>
        <Can
          I={InventoryAdjustmentAction.Delete}
          a={AbilitySubject.InventoryAdjustment}
        >
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_adjustment')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
