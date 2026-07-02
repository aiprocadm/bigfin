import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  Banknote,
  Coins,
  FilePlus2,
  MoreHorizontal,
  Pencil,
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
  PaymentMadeAction,
  SaleInvoiceAction,
  VendorAction,
} from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import type { VendorDetail } from './types';

interface VendorDetailsHeaderV2Props {
  vendor: VendorDetail;
  vendorId: number;
}

// Легаси-HOC'и (ts-nocheck) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Шапка деталей поставщика: имя + статус-пилюля + «Редактировать» + меню «⋯»
 * с теми же действиями, что и легаси actions-bar (новые операции, правка
 * начального сальдо, удаление).
 */
function VendorDetailsHeaderV2Root({
  vendor,
  vendorId,
  openAlert,
  openDialog,
  closeDrawer,
}: VendorDetailsHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();

  // Переход на страницу + закрытие drawer'а (как в легаси actions-bar).
  const pushAndClose = (path: string) => {
    history.push(path);
    closeDrawer(DRAWERS.VENDOR_DETAILS);
  };

  const handleEditVendor = () => pushAndClose(`/vendors/${vendorId}/edit`);
  const handleNewBill = () => pushAndClose('/bills/new');
  const handleNewPayment = () => pushAndClose('/payments-made/new');

  const handleEditOpeningBalance = () => {
    openDialog('vendor-opening-balance', { vendorId });
  };
  const handleDeleteVendor = () => {
    openAlert('vendor-delete', { contactId: vendorId });
  };

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">{vendor.display_name}</DrawerTitle>

        <Badge variant={vendor.active ? 'secondary' : 'outline'}>
          {intl.get(
            vendor.active ? 'vendors.status.active' : 'vendors.status.inactive',
          )}
        </Badge>

        <span className="ml-auto flex items-center gap-2">
          <Can I={VendorAction.Edit} a={AbilitySubject.Vendor}>
            <Button variant="secondary" size="sm" onClick={handleEditVendor}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('vendor.drawer.action.edit')}
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
              <Can I={SaleInvoiceAction.Create} a={AbilitySubject.Invoice}>
                <DropdownMenuItem onClick={handleNewBill}>
                  <FilePlus2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('vendor.drawer.action.new_invoice')}
                </DropdownMenuItem>
              </Can>
              <Can I={PaymentMadeAction.Create} a={AbilitySubject.PaymentMade}>
                <DropdownMenuItem onClick={handleNewPayment}>
                  <Banknote className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('vendor.drawer.action.new_payment')}
                </DropdownMenuItem>
              </Can>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleEditOpeningBalance}>
                <Coins className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('vendor.drawer.action.edit_opening_balance')}
              </DropdownMenuItem>

              <Can I={VendorAction.Delete} a={AbilitySubject.Vendor}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeleteVendor}
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

export const VendorDetailsHeaderV2 = compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(VendorDetailsHeaderV2Root) as ComponentType<VendorDetailsHeaderV2Props>;
