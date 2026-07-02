import intl from 'react-intl-universal';
import {
  Check,
  Eye,
  FileOutput,
  Mail,
  MoreHorizontal,
  Pencil,
  Printer,
  Send,
  Trash2,
  X,
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
import { SaleEstimateAction, AbilitySubject } from '@/constants/abilityOption';

export interface EstimateRowActions {
  onViewDetails: (row: EstimateRow) => void;
  onEdit: (row: EstimateRow) => void;
  onConvert: (row: EstimateRow) => void;
  onDeliver: (row: EstimateRow) => void;
  onApprove: (row: EstimateRow) => void;
  onReject: (row: EstimateRow) => void;
  onSendMail: (row: EstimateRow) => void;
  onPrint: (row: EstimateRow) => void;
  onDelete: (row: EstimateRow) => void;
}

export interface EstimateRow {
  id: number;
  estimate_number?: string | null;
  reference?: string | null;
  formatted_estimate_date?: string;
  formatted_expiration_date?: string;
  amount: number;
  currency_code: string;
  customer?: { display_name?: string };
  is_approved: boolean;
  is_rejected: boolean;
  is_expired: boolean;
  is_delivered: boolean;
  is_converted_to_invoice: boolean;
}

/**
 * Меню действий строки сметы (shadcn DropdownMenu).
 * Условия видимости пунктов повторяют легаси ActionsMenu 1:1.
 */
export function EstimatesActionsMenuV2({
  row,
  actions,
}: {
  row: EstimateRow;
  actions: EstimateRowActions;
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
        <Can I={SaleEstimateAction.Edit} a={AbilitySubject.Estimate}>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('edit_estimate')}
          </DropdownMenuItem>
          {!row.is_converted_to_invoice && (
            <DropdownMenuItem onClick={() => actions.onConvert(row)}>
              <FileOutput className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('convert_to_invoice')}
            </DropdownMenuItem>
          )}
          {!row.is_delivered && (
            <DropdownMenuItem onClick={() => actions.onDeliver(row)}>
              <Send className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('mark_as_delivered')}
            </DropdownMenuItem>
          )}
          {row.is_delivered && row.is_approved ? (
            <DropdownMenuItem onClick={() => actions.onReject(row)}>
              <X className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('mark_as_rejected')}
            </DropdownMenuItem>
          ) : row.is_delivered && row.is_rejected ? (
            <DropdownMenuItem onClick={() => actions.onApprove(row)}>
              <Check className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('mark_as_approved')}
            </DropdownMenuItem>
          ) : row.is_delivered ? (
            <>
              <DropdownMenuItem onClick={() => actions.onApprove(row)}>
                <Check className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('mark_as_approved')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onReject(row)}>
                <X className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('mark_as_rejected')}
              </DropdownMenuItem>
            </>
          ) : null}
        </Can>
        <Can I={SaleEstimateAction.View} a={AbilitySubject.Estimate}>
          <DropdownMenuItem onClick={() => actions.onSendMail(row)}>
            <Mail className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('estimate.action.send_mail')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onPrint(row)}>
            <Printer className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('print')}
          </DropdownMenuItem>
        </Can>
        <Can I={SaleEstimateAction.Delete} a={AbilitySubject.Estimate}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('delete_estimate')}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
