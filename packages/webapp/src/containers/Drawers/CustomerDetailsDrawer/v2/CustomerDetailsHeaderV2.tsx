import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  Banknote,
  Coins,
  FilePlus2,
  FileText,
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
  CustomerAction,
  PaymentReceiveAction,
  SaleEstimateAction,
  SaleInvoiceAction,
  SaleReceiptAction,
} from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import type { CustomerDetail } from './types';

interface CustomerDetailsHeaderV2Props {
  customer: CustomerDetail;
  customerId: number;
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
 * Шапка деталей клиента: имя + статус-пилюля + «Редактировать» + меню «⋯»
 * с теми же действиями, что и легаси actions-bar (новые операции, правка
 * начального сальдо, удаление).
 */
function CustomerDetailsHeaderV2Root({
  customer,
  customerId,
  openAlert,
  openDialog,
  closeDrawer,
}: CustomerDetailsHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();

  // Переход на страницу + закрытие drawer'а (как в легаси actions-bar).
  const pushAndClose = (path: string) => {
    history.push(path);
    closeDrawer(DRAWERS.CUSTOMER_DETAILS);
  };

  const handleEditCustomer = () => pushAndClose(`/customers/${customerId}/edit`);
  const handleNewInvoice = () => pushAndClose('/invoices/new');
  const handleNewEstimate = () => pushAndClose('/estimates/new');
  const handleNewReceipt = () => pushAndClose('/receipts/new');
  const handleNewPayment = () => pushAndClose('/payment-received/new');

  const handleEditOpeningBalance = () => {
    openDialog('customer-opening-balance', { customerId });
  };
  const handleDeleteCustomer = () => {
    openAlert('customer-delete', { contactId: customerId });
  };

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">{customer.display_name}</DrawerTitle>

        <Badge variant={customer.active ? 'secondary' : 'outline'}>
          {intl.get(
            customer.active
              ? 'customers.status.active'
              : 'customers.status.inactive',
          )}
        </Badge>

        <span className="ml-auto flex items-center gap-2">
          <Can I={CustomerAction.Edit} a={AbilitySubject.Customer}>
            <Button variant="secondary" size="sm" onClick={handleEditCustomer}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('customer.drawer.action.edit')}
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
                <DropdownMenuItem onClick={handleNewInvoice}>
                  <FilePlus2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('customer.drawer.action.new_invoice')}
                </DropdownMenuItem>
              </Can>
              <Can I={SaleEstimateAction.Create} a={AbilitySubject.Estimate}>
                <DropdownMenuItem onClick={handleNewEstimate}>
                  <FileText className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('customer.drawer.action.new_estimate')}
                </DropdownMenuItem>
              </Can>
              <Can I={SaleReceiptAction.Create} a={AbilitySubject.Receipt}>
                <DropdownMenuItem onClick={handleNewReceipt}>
                  <Receipt className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('customer.drawer.action.new_receipt')}
                </DropdownMenuItem>
              </Can>
              <Can
                I={PaymentReceiveAction.Create}
                a={AbilitySubject.PaymentReceive}
              >
                <DropdownMenuItem onClick={handleNewPayment}>
                  <Banknote className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('customer.drawer.action.new_payment')}
                </DropdownMenuItem>
              </Can>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleEditOpeningBalance}>
                <Coins className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('customer.drawer.action.edit_opening_balance')}
              </DropdownMenuItem>

              <Can I={CustomerAction.Delete} a={AbilitySubject.Customer}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeleteCustomer}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {customer.formatted_customer_type ? (
        <p className="text-sm text-text-secondary">
          {customer.formatted_customer_type}
        </p>
      ) : null}
    </DrawerHeader>
  );
}

export const CustomerDetailsHeaderV2 = compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(CustomerDetailsHeaderV2Root) as ComponentType<CustomerDetailsHeaderV2Props>;
