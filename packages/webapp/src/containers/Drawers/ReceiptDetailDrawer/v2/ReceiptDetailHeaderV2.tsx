import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  Mail,
  MoreHorizontal,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react';

import { Can } from '@/components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Features } from '@/constants';
import { AbilitySubject, SaleReceiptAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import type { ReceiptDetail } from './types';

interface ReceiptDetailHeaderV2Props {
  receipt: ReceiptDetail;
  receiptId: number;
}

// Легаси-HOC'и без типов не экспортируют инжектируемые пропсы —
// описываем локально, не трогая общие модули.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  openDrawer: (name: string, payload?: Record<string, unknown>) => void;
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Шапка деталей чека: номер + статус-пилюля + «Редактировать» + меню «⋯»
 * с теми же действиями, что и легаси actions-bar (отправка на email,
 * печать, удаление).
 */
function ReceiptDetailHeaderV2Root({
  receipt,
  receiptId,
  openAlert,
  openDialog,
  openDrawer,
  closeDrawer,
}: ReceiptDetailHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();
  const { featureCan } = useFeatureCan();

  // Переход на страницу правки + закрытие drawer'а (как в легаси actions-bar).
  const handleEditReceipt = () => {
    history.push(`/receipts/${receiptId}/edit`);
    closeDrawer(DRAWERS.RECEIPT_DETAILS);
  };
  const handleSendMail = () => {
    openDrawer(DRAWERS.RECEIPT_SEND_MAIL, { receiptId });
  };
  const handlePrintReceipt = () => {
    openDialog('receipt-pdf-preview', { receiptId });
  };
  const handleDeleteReceipt = () => {
    openAlert('receipt-delete', { receiptId });
  };

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('receipt.drawer.title', {
            number: receipt.receipt_number,
          })}
        </DrawerTitle>

        <Badge variant={receipt.is_closed ? 'secondary' : 'outline'}>
          {intl.get(receipt.is_closed ? 'closed' : 'draft')}
        </Badge>

        <span className="ml-auto flex items-center gap-2">
          <Can I={SaleReceiptAction.Edit} a={AbilitySubject.Receipt}>
            <Button variant="secondary" size="sm" onClick={handleEditReceipt}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('edit')}
            </Button>
          </Can>

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
              <Can I={SaleReceiptAction.View} a={AbilitySubject.Receipt}>
                <DropdownMenuItem onClick={handleSendMail}>
                  <Mail className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('send_mail')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintReceipt}>
                  <Printer className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('print')}
                </DropdownMenuItem>
              </Can>

              <Can I={SaleReceiptAction.Delete} a={AbilitySubject.Receipt}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeleteReceipt}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {featureCan(Features.Branches) && receipt.branch?.name ? (
        <p className="text-sm text-text-secondary">
          {intl.get('receipt.drawer.subtitle', {
            value: receipt.branch.name,
          })}
        </p>
      ) : null}
    </DrawerHeader>
  );
}

export const ReceiptDetailHeaderV2 = compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(ReceiptDetailHeaderV2Root) as ComponentType<ReceiptDetailHeaderV2Props>;
