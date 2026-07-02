import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Features } from '@/constants';
import { AbilitySubject, PaymentMadeAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import type { PaymentMadeDetail } from './types';

interface PaymentMadeDetailHeaderV2Props {
  paymentMade: PaymentMadeDetail;
  paymentMadeId: number;
}

// Легаси-HOC'и (ts-nocheck) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

// useFeatureCan — легаси-хук без типов, кастуем результат локально.
interface UseFeatureCanResult {
  featureCan: (feature: string) => boolean;
}

/**
 * Шапка деталей исходящего платежа: заголовок с номером платежа,
 * подразделение (если включено), «Редактировать» + меню «⋯» с теми же
 * действиями, что и легаси actions-bar (удаление).
 */
function PaymentMadeDetailHeaderV2Root({
  paymentMade,
  paymentMadeId,
  openAlert,
  closeDrawer,
}: PaymentMadeDetailHeaderV2Props &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();
  const { featureCan } = useFeatureCan() as UseFeatureCanResult;

  // Переход на страницу правки + закрытие drawer'а (как в легаси actions-bar).
  const handleEditPaymentMade = () => {
    history.push(`/payments-made/${paymentMadeId}/edit`);
    closeDrawer(DRAWERS.PAYMENT_MADE_DETAILS);
  };
  const handleDeletePaymentMade = () => {
    openAlert('payment-made-delete', { paymentMadeId });
  };

  const showBranch = featureCan(Features.Branches) && paymentMade.branch?.name;

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('payment_made.drawer.title', {
            number: paymentMade.payment_number
              ? `(${paymentMade.payment_number})`
              : '',
          })}
        </DrawerTitle>

        <span className="ml-auto flex items-center gap-2">
          <Can I={PaymentMadeAction.Edit} a={AbilitySubject.PaymentMade}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEditPaymentMade}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('edit_payment_made')}
            </Button>
          </Can>

          <Can I={PaymentMadeAction.Delete} a={AbilitySubject.PaymentMade}>
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
                  onClick={handleDeletePaymentMade}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Can>
        </span>
      </div>

      {showBranch ? (
        <p className="text-sm text-text-secondary">
          {intl.get('payment_made.drawer.subtitle', {
            value: paymentMade.branch?.name,
          })}
        </p>
      ) : null}
    </DrawerHeader>
  );
}

export const PaymentMadeDetailHeaderV2 = compose(
  withDrawerActions,
  withAlertActions,
)(PaymentMadeDetailHeaderV2Root) as ComponentType<PaymentMadeDetailHeaderV2Props>;
