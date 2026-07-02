import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { MoreHorizontal, Pencil, Receipt, Trash2, Undo2 } from 'lucide-react';

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
import { VendorCreditAction, AbilitySubject } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import type { VendorCreditDetail } from './types';

interface VendorCreditDetailHeaderV2Props {
  vendorCredit: VendorCreditDetail;
  vendorCreditId: number;
}

interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDialogActionsProps {
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

function StatusBadge({ vendorCredit }: { vendorCredit: VendorCreditDetail }) {
  if (vendorCredit.is_open) {
    return <Badge variant="secondary">{intl.get('open')}</Badge>;
  }
  if (vendorCredit.is_closed) {
    return <Badge variant="success">{intl.get('closed')}</Badge>;
  }
  return <Badge variant="outline">{intl.get('draft')}</Badge>;
}

/**
 * Шапка деталей возврата поставщику: номер + статус + «Редактировать» + «⋯»
 * (возврат средств / сверка / удалить) — паритет с легаси actions-bar.
 */
function VendorCreditDetailHeaderV2Root({
  vendorCredit,
  vendorCreditId,
  openAlert,
  openDialog,
  closeDrawer,
}: VendorCreditDetailHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();

  const handleEdit = () => {
    history.push(`/vendor-credits/${vendorCreditId}/edit`);
    closeDrawer(DRAWERS.VENDOR_CREDIT_DETAILS);
  };
  const handleRefund = () =>
    openDialog('refund-vendor-credit', { vendorCreditId });
  const handleReconcile = () =>
    openDialog('reconcile-vendor-credit', { vendorCreditId });
  const handleDelete = () =>
    openAlert('vendor-credit-delete', { vendorCreditId });

  const canRefundOrReconcile =
    !vendorCredit.is_closed && !vendorCredit.is_draft;

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('vendor_credit.drawer_vendor_credit_detail', {
            vendorNumber: vendorCredit.vendor_credit_number,
          })}
        </DrawerTitle>

        <StatusBadge vendorCredit={vendorCredit} />

        <span className="ml-auto flex items-center gap-2">
          <Can I={VendorCreditAction.Edit} a={AbilitySubject.VendorCredit}>
            <Button variant="secondary" size="sm" onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('vendor_credits.label.edit_vendor_credit')}
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
              <Can I={VendorCreditAction.Refund} a={AbilitySubject.VendorCredit}>
                {canRefundOrReconcile ? (
                  <DropdownMenuItem onClick={handleRefund}>
                    <Undo2 className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('refund')}
                  </DropdownMenuItem>
                ) : null}
              </Can>
              <Can I={VendorCreditAction.Edit} a={AbilitySubject.VendorCredit}>
                {canRefundOrReconcile ? (
                  <DropdownMenuItem onClick={handleReconcile}>
                    <Receipt className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('vendor_credits.action.reconcile_with_bills')}
                  </DropdownMenuItem>
                ) : null}
              </Can>
              <Can I={VendorCreditAction.Delete} a={AbilitySubject.VendorCredit}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>
    </DrawerHeader>
  );
}

export const VendorCreditDetailHeaderV2 = compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(VendorCreditDetailHeaderV2Root) as ComponentType<VendorCreditDetailHeaderV2Props>;
