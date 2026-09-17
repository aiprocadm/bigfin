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
import {
  AbilitySubject,
  PaymentReceiveAction,
} from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import type { PaymentReceivedDetail } from './types';

interface PaymentReceiveDetailHeaderV2Props {
  paymentReceive: PaymentReceivedDetail;
  paymentReceiveId: number;
}

// Легаси-HOC'и не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  openDrawer: (name: string, payload?: Record<string, unknown>) => void;
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

// useFeatureCan — легаси-хук без типов, кастуем результат локально.
type UseFeatureCanResult = { featureCan: (feature: string) => boolean };

/**
 * Шапка деталей поступления оплаты: номер платежа + «Редактировать» +
 * меню «⋯» с теми же действиями, что и легаси actions-bar (письмо,
 * печать, удаление). Подзаголовок — подразделение (если включено).
 */
function PaymentReceiveDetailHeaderV2Root({
  paymentReceive,
  paymentReceiveId,
  openAlert,
  openDialog,
  openDrawer,
  closeDrawer,
}: PaymentReceiveDetailHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();
  const { featureCan } = useFeatureCan() as UseFeatureCanResult;

  // Переход на страницу правки + закрытие drawer'а (как в легаси actions-bar).
  const handleEditPaymentReceive = () => {
    history.push(`/payments-received/${paymentReceiveId}/edit`);
    closeDrawer(DRAWERS.PAYMENT_RECEIVED_DETAILS);
  };
  const handleMailPaymentReceive = () => {
    openDrawer(DRAWERS.PAYMENT_RECEIVED_SEND_MAIL, {
      paymentReceivedId: paymentReceiveId,
    });
  };
  const handlePrintPaymentReceive = () => {
    openDialog('payment-pdf-preview', { paymentReceiveId });
  };
  const handleDeletePaymentReceive = () => {
    openAlert('payment-received-delete', { paymentReceiveId });
  };

  const branchName = paymentReceive.branch?.name;

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('payment_received.drawer.title', {
            number: paymentReceive.payment_receive_no,
          })}
        </DrawerTitle>

        <span className="ml-auto flex items-center gap-2">
          <Can
            I={PaymentReceiveAction.Edit}
            a={AbilitySubject.PaymentReceive}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEditPaymentReceive}
            >
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
              <Can
                I={PaymentReceiveAction.View}
                a={AbilitySubject.PaymentReceive}
              >
                <DropdownMenuItem onClick={handleMailPaymentReceive}>
                  <Mail className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('send_mail')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintPaymentReceive}>
                  <Printer className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('print')}
                </DropdownMenuItem>
              </Can>

              <Can
                I={PaymentReceiveAction.Delete}
                a={AbilitySubject.PaymentReceive}
              >
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeletePaymentReceive}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {featureCan(Features.Branches) && branchName ? (
        <p className="text-sm text-text-secondary">
          {intl.get('payment_received.drawer.subtitle', { value: branchName })}
        </p>
      ) : null}
    </DrawerHeader>
  );
}

export const PaymentReceiveDetailHeaderV2 = compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(PaymentReceiveDetailHeaderV2Root) as ComponentType<PaymentReceiveDetailHeaderV2Props>;
