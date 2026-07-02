import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  ArrowRightLeft,
  Banknote,
  MoreHorizontal,
  Pencil,
  Receipt,
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
import {
  AbilitySubject,
  BillAction,
  PaymentMadeAction,
} from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { Features } from '@/constants/features';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import type { BillDetail } from './types';

interface BillDetailsHeaderV2Props {
  bill: BillDetail;
  billId: number;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Статус счёта поставщика пилюлей Badge. Красный (destructive) —
 * только просрочка, остальные статусы сдержанные (правило цвета).
 */
function BillStatusBadgeV2({ bill }: { bill: BillDetail }) {
  if (bill.is_fully_paid && bill.is_open) {
    return <Badge variant="success">{intl.get('paid')}</Badge>;
  }
  if (bill.is_open) {
    return bill.is_overdue ? (
      <Badge variant="destructive">{intl.get('overdue')}</Badge>
    ) : (
      <Badge variant="secondary">{intl.get('due')}</Badge>
    );
  }
  return <Badge variant="outline">{intl.get('draft')}</Badge>;
}

/**
 * Шапка деталей счёта поставщика: заголовок + статус-пилюля +
 * «Редактировать» + меню «⋯» со всеми действиями легаси actions-bar
 * (платёж, накладные расходы, преобразование в возврат, удаление).
 */
function BillDetailsHeaderV2Root({
  bill,
  billId,
  openAlert,
  openDialog,
  closeDrawer,
}: BillDetailsHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();
  const { featureCan } = useFeatureCan();

  // Переход на страницу + закрытие drawer'а (как в легаси actions-bar).
  const pushAndClose = (path: string) => {
    history.push(path);
    closeDrawer(DRAWERS.BILL_DETAILS);
  };

  const handleEditBill = () => pushAndClose(`/bills/${billId}/edit`);

  const handleConvertToVendorCredit = () => {
    history.push(`/vendor-credits/new?from_bill_id=${billId}`, { billId });
    closeDrawer(DRAWERS.BILL_DETAILS);
  };
  const handleQuickPayment = () => {
    openDialog('quick-payment-made', { billId });
  };
  const handleAllocateLandedCost = () => {
    openDialog('allocate-landed-cost', { billId });
  };
  const handleDeleteBill = () => {
    openAlert('bill-delete', { billId });
  };

  const showBranch = featureCan(Features.Branches) && bill.branch?.name;

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('bill.drawer.title', {
            number: bill.bill_number ? `(${bill.bill_number})` : '',
          })}
        </DrawerTitle>

        <BillStatusBadgeV2 bill={bill} />

        <span className="ml-auto flex items-center gap-2">
          <Can I={BillAction.Edit} a={AbilitySubject.Bill}>
            <Button variant="secondary" size="sm" onClick={handleEditBill}>
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
              <Can I={PaymentMadeAction.Create} a={AbilitySubject.PaymentMade}>
                {bill.is_open && !bill.is_fully_paid && (
                  <DropdownMenuItem onClick={handleQuickPayment}>
                    <Banknote className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('add_payment')}
                  </DropdownMenuItem>
                )}
              </Can>

              <Can I={BillAction.Edit} a={AbilitySubject.Bill}>
                <DropdownMenuItem onClick={handleAllocateLandedCost}>
                  <Receipt className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('bill.allocate_landed_coast')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleConvertToVendorCredit}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('bill.convert_to_credit_note')}
                </DropdownMenuItem>
              </Can>

              <Can I={BillAction.Delete} a={AbilitySubject.Bill}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeleteBill}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {showBranch ? (
        <p className="text-sm text-text-secondary">
          {intl.get('bill.drawer.subtitle', { value: bill.branch?.name })}
        </p>
      ) : null}
    </DrawerHeader>
  );
}

export const BillDetailsHeaderV2 = compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(BillDetailsHeaderV2Root) as ComponentType<BillDetailsHeaderV2Props>;
