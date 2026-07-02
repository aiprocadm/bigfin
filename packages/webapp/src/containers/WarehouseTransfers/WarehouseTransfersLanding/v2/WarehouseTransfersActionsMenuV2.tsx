import intl from 'react-intl-universal';
import { Check, Eye, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface WarehouseTransferRow {
  id: number;
  formatted_date: string;
  transaction_number: string;
  from_warehouse?: { name?: string };
  to_warehouse?: { name?: string };
  is_initiated: boolean;
  is_transferred: boolean;
}

export interface WarehouseTransferRowActions {
  onViewDetails: (row: WarehouseTransferRow) => void;
  onEdit: (row: WarehouseTransferRow) => void;
  onInitiate: (row: WarehouseTransferRow) => void;
  onTransfer: (row: WarehouseTransferRow) => void;
  onDelete: (row: WarehouseTransferRow) => void;
}

/**
 * Меню действий строки перемещения между складами (shadcn DropdownMenu).
 */
export function WarehouseTransfersActionsMenuV2({
  row,
  actions,
}: {
  row: WarehouseTransferRow;
  actions: WarehouseTransferRowActions;
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => actions.onEdit(row)}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('warehouse_transfer.action.edit_warehouse_transfer')}
        </DropdownMenuItem>
        {!row.is_transferred && !row.is_initiated && (
          <DropdownMenuItem onClick={() => actions.onInitiate(row)}>
            <Check className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('warehouse_transfer.action.initiate_transfer')}
          </DropdownMenuItem>
        )}
        {row.is_initiated && !row.is_transferred && (
          <DropdownMenuItem onClick={() => actions.onTransfer(row)}>
            <Send className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('warehouse_transfer.action.mark_as_transferred')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onClick={() => actions.onDelete(row)}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('warehouse_transfer.action.delete_warehouse_transfer')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
