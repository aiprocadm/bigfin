import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  Banknote,
  CheckCircle2,
  FileText,
  FileX2,
  Link2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Printer,
  Trash2,
  Undo2,
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
import {
  AbilitySubject,
  PaymentReceiveAction,
  SaleInvoiceAction,
} from '@/constants/abilityOption';
import { DialogsName } from '@/constants/dialogs';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import type { InvoiceDetail } from './types';

interface InvoiceDetailHeaderV2Props {
  invoice: InvoiceDetail;
  invoiceId: number;
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
interface UseFeatureCanResult {
  featureCan: (feature: string) => boolean;
}

/**
 * Статус-пилюля счёта (та же логика, что в легаси InvoiceDetailsStatus):
 * оплачен → success, просрочен → danger, отправлен → secondary,
 * черновик → outline.
 */
export function InvoiceStatusBadgeV2({ invoice }: { invoice: InvoiceDetail }) {
  if (invoice.is_fully_paid && invoice.is_delivered) {
    return <Badge variant="success">{intl.get('paid')}</Badge>;
  }
  if (invoice.is_delivered) {
    return invoice.is_overdue ? (
      <Badge variant="destructive">{intl.get('overdue')}</Badge>
    ) : (
      <Badge variant="secondary">{intl.get('delivered')}</Badge>
    );
  }
  return <Badge variant="outline">{intl.get('draft')}</Badge>;
}

/**
 * Шапка деталей счёта: номер + статус-пилюля + «Редактировать» + меню «⋯»
 * со всеми действиями легаси actions-bar (платёж, письмо, печать, ссылка
 * на оплату, отправка, безнадёжный долг, кредит-нота, SMS, удаление).
 */
function InvoiceDetailHeaderV2Root({
  invoice,
  invoiceId,
  openAlert,
  openDialog,
  openDrawer,
  closeDrawer,
}: InvoiceDetailHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();
  const { featureCan } = useFeatureCan() as UseFeatureCanResult;

  // Переход на страницу + закрытие drawer'а (как в легаси actions-bar).
  const pushAndClose = (path: string) => {
    history.push(path);
    closeDrawer(DRAWERS.INVOICE_DETAILS);
  };

  const handleEditInvoice = () => pushAndClose(`/invoices/${invoiceId}/edit`);
  const handleConvertToCreditNote = () =>
    pushAndClose(`/credit-notes/new?from_invoice_id=${invoiceId}`);

  const handleQuickPayment = () =>
    openDialog('quick-payment-receive', { invoiceId });
  const handlePrintInvoice = () =>
    openDialog('invoice-pdf-preview', { invoiceId });
  const handleBadDebt = () => openDialog('write-off-bad-debt', { invoiceId });
  const handleNotifyViaSMS = () =>
    openDialog('notify-invoice-via-sms', { invoiceId });
  const handleShareLink = () =>
    openDialog(DialogsName.SharePaymentLink, {
      transactionId: invoiceId,
      transactionType: 'SaleInvoice',
    });

  const handleDeliverInvoice = () => openAlert('invoice-deliver', { invoiceId });
  const handleCancelBadDebt = () => openAlert('cancel-bad-debt', { invoiceId });
  const handleDeleteInvoice = () => openAlert('invoice-delete', { invoiceId });

  const handleMailInvoice = () =>
    openDrawer(DRAWERS.INVOICE_SEND_MAIL, { invoiceId });

  const showAddPayment = Boolean(invoice.is_delivered && !invoice.is_fully_paid);

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('invoice_details.drawer.title', {
            invoiceNumber: invoice.invoice_no,
          })}
        </DrawerTitle>

        <InvoiceStatusBadgeV2 invoice={invoice} />

        <span className="ml-auto flex items-center gap-2">
          <Can I={SaleInvoiceAction.Edit} a={AbilitySubject.Invoice}>
            <Button variant="secondary" size="sm" onClick={handleEditInvoice}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('edit_invoice')}
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
                I={PaymentReceiveAction.Create}
                a={AbilitySubject.PaymentReceive}
              >
                {showAddPayment ? (
                  <DropdownMenuItem onClick={handleQuickPayment}>
                    <Banknote className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('add_payment')}
                  </DropdownMenuItem>
                ) : null}
              </Can>

              <Can I={SaleInvoiceAction.View} a={AbilitySubject.Invoice}>
                <DropdownMenuItem onClick={handleMailInvoice}>
                  <Mail className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('send_mail')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintInvoice}>
                  <Printer className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('print')}
                </DropdownMenuItem>
              </Can>

              <DropdownMenuItem onClick={handleShareLink}>
                <Link2 className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('invoice.drawer.action.share_link')}
              </DropdownMenuItem>

              {/* Группа «прочее» — как в легаси, под гейтом Writeoff. */}
              <Can I={SaleInvoiceAction.Writeoff} a={AbilitySubject.Invoice}>
                <DropdownMenuSeparator />
                {!invoice.is_delivered ? (
                  <DropdownMenuItem onClick={handleDeliverInvoice}>
                    <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('mark_as_delivered')}
                  </DropdownMenuItem>
                ) : null}
                {!invoice.is_writtenoff ? (
                  <DropdownMenuItem onClick={handleBadDebt}>
                    <FileX2 className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('bad_debt.dialog.bad_debt')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleCancelBadDebt}>
                    <Undo2 className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('bad_debt.dialog.cancel_bad_debt')}
                  </DropdownMenuItem>
                )}
                <Can I={SaleInvoiceAction.Edit} a={AbilitySubject.Invoice}>
                  <DropdownMenuItem onClick={handleConvertToCreditNote}>
                    <FileText className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('invoice.convert_to_credit_note')}
                  </DropdownMenuItem>
                </Can>
                <Can I={SaleInvoiceAction.NotifyBySms} a={AbilitySubject.Invoice}>
                  <DropdownMenuItem onClick={handleNotifyViaSMS}>
                    <MessageSquare className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('notify_via_sms.dialog.notify_via_sms')}
                  </DropdownMenuItem>
                </Can>
              </Can>

              <Can I={SaleInvoiceAction.Delete} a={AbilitySubject.Invoice}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeleteInvoice}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {featureCan(Features.Branches) && invoice.branch?.name ? (
        <p className="text-sm text-text-secondary">
          {intl.get('invoice_details.drawer.subtitle', {
            value: invoice.branch.name,
          })}
        </p>
      ) : null}
    </DrawerHeader>
  );
}

export const InvoiceDetailHeaderV2 = compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(InvoiceDetailHeaderV2Root) as ComponentType<InvoiceDetailHeaderV2Props>;
