// @ts-nocheck
import intl from 'react-intl-universal';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  Button,
  NavbarGroup,
  Classes,
  NavbarDivider,
  Intent,
  Tooltip,
  Position,
} from '@blueprintjs/core';

import { useInvoiceDetailDrawerContext } from './InvoiceDetailDrawerProvider';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';

import {
  If,
  Can,
  Icon,
  DrawerActionsBar,
  FormattedMessage as T,
} from '@/components';
import { FeatureCan } from '@/components/FeatureGuard/FeatureCan';
import { Features } from '@/constants/features';
import useApiRequest from '@/hooks/useRequest';
import {
  SaleInvoiceAction,
  PaymentReceiveAction,
  AbilitySubject,
} from '../../../constants/abilityOption';

import { compose } from '@/utils';
import { BadDebtMenuItem } from './utils';
import { DRAWERS } from '@/constants/drawers';
import { DialogsName } from '@/constants/dialogs';
import { ArrowBottomLeft } from '@/icons/ArrowBottomLeft';

/**
 * Invoice details action bar.
 */
function InvoiceDetailActionsBar({
  // #withDialogActions
  openDialog,

  // #withAlertActions
  openAlert,

  // #withDrawerActions
  openDrawer,
  closeDrawer,
}) {
  const history = useHistory();

  // Invoice detail drawer context.
  const { invoiceId, invoice } = useInvoiceDetailDrawerContext();

  // Handle edit sale invoice.
  const handleEditInvoice = () => {
    history.push(`/invoices/${invoiceId}/edit`);
    closeDrawer(DRAWERS.INVOICE_DETAILS);
  };

  // Hanlde deliver sale invoice.
  const handleDeliverInvoice = ({ id }) => {
    openAlert('invoice-deliver', { invoiceId });
  };

  // Handle convert to invoice.
  const handleConvertToCreitNote = () => {
    history.push(`/credit-notes/new?from_invoice_id=${invoiceId}`, {
      invoiceId: invoiceId,
    });
    closeDrawer(DRAWERS.INVOICE_DETAILS);
  };

  // Handle delete sale invoice.
  const handleDeleteInvoice = () => {
    openAlert('invoice-delete', { invoiceId });
  };

  // Handle print invoices.
  const handlePrintInvoice = () => {
    openDialog('invoice-pdf-preview', { invoiceId });
  };

  const apiRequest = useApiRequest();

  // Печатные формы РФ (за флагом ru_print_forms): открывает PDF в новой вкладке.
  const openRuPrintForm = (form) => {
    apiRequest
      .http({
        method: 'get',
        url: `/api/ru-print-forms/sale-invoices/${invoiceId}/${form}`,
        headers: { accept: 'application/pdf' },
        responseType: 'blob',
      })
      .then((response) => {
        const file = new Blob([response.data], { type: 'application/pdf' });
        window.open(URL.createObjectURL(file));
      });
  };
  const handleRuPaymentInvoice = () => openRuPrintForm('payment-invoice');
  const handleRuAct = () => openRuPrintForm('act');
  const handleRuUpd = () => openRuPrintForm('upd');

  // Handle quick payment invoice.
  const handleQuickPaymentInvoice = () => {
    openDialog('quick-payment-receive', { invoiceId });
  };

  // Handle write-off invoice.
  const handleBadDebtInvoice = () => {
    openDialog('write-off-bad-debt', { invoiceId });
  };
  // Handle notify via SMS.
  const handleNotifyViaSMS = () => {
    openDialog('notify-invoice-via-sms', { invoiceId });
  };

  // Handle cancele write-off invoice.
  const handleCancelBadDebtInvoice = () => {
    openAlert('cancel-bad-debt', { invoiceId });
  };

  // handle send mail button click.
  const handleMailInvoice = () => {
    openDrawer(DRAWERS.INVOICE_SEND_MAIL, { invoiceId });
  };

  const handleShareButtonClick = () => {
    openDialog(DialogsName.SharePaymentLink, {
      transactionId: invoiceId,
      transactionType: 'SaleInvoice',
    });
  };

  return (
    <DrawerActionsBar>
      <NavbarGroup>
        <Can I={SaleInvoiceAction.Edit} a={AbilitySubject.Invoice}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="pen-18" />}
            text={<T id={'edit_invoice'} />}
            onClick={handleEditInvoice}
          />
          <NavbarDivider />
        </Can>
        <Can I={PaymentReceiveAction.Create} a={AbilitySubject.PaymentReceive}>
          <If condition={invoice.is_delivered && !invoice.is_fully_paid}>
            <Button
              className={Classes.MINIMAL}
              icon={<ArrowBottomLeft size={16} />}
              text={<T id={'add_payment'} />}
              onClick={handleQuickPaymentInvoice}
            />
            <NavbarDivider />
          </If>
        </Can>
        <Can I={SaleInvoiceAction.View} a={AbilitySubject.Invoice}>
          <Button
            text={intl.get('send_mail')}
            icon={<Icon icon="envelope" />}
            onClick={handleMailInvoice}
            className={Classes.MINIMAL}
          />
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="print-16" />}
            text={<T id={'print'} />}
            onClick={handlePrintInvoice}
          />
          <FeatureCan feature={Features.RuPrintForms}>
            <Button
              className={Classes.MINIMAL}
              icon={<Icon icon="print-16" />}
              text={<T id={'ru_print_forms.payment_invoice.button'} />}
              onClick={handleRuPaymentInvoice}
            />
            <Button
              className={Classes.MINIMAL}
              icon={<Icon icon="print-16" />}
              text={<T id={'ru_print_forms.act.button'} />}
              onClick={handleRuAct}
            />
            <Button
              className={Classes.MINIMAL}
              icon={<Icon icon="print-16" />}
              text={<T id={'ru_print_forms.upd.button'} />}
              onClick={handleRuUpd}
            />
          </FeatureCan>
          <NavbarDivider />
        </Can>
        <Can I={SaleInvoiceAction.Delete} a={AbilitySubject.Invoice}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon={'trash-16'} iconSize={16} />}
            text={<T id={'delete'} />}
            intent={Intent.DANGER}
            onClick={handleDeleteInvoice}
          />
        </Can>
        <NavbarDivider />
        <Tooltip content="Share" position={Position.BOTTOM} minimal>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon={'share'} iconSize={16} />}
            onClick={handleShareButtonClick}
          />
        </Tooltip>

        <Can I={SaleInvoiceAction.Writeoff} a={AbilitySubject.Invoice}>
          <NavbarDivider />
          <BadDebtMenuItem
            payload={{
              onBadDebt: handleBadDebtInvoice,
              onCancelBadDebt: handleCancelBadDebtInvoice,
              onNotifyViaSMS: handleNotifyViaSMS,
              onConvert: handleConvertToCreitNote,
              onDeliver: handleDeliverInvoice,
            }}
          />
        </Can>
      </NavbarGroup>
    </DrawerActionsBar>
  );
}

export default compose(
  withDialogActions,
  withDrawerActions,
  withAlertActions,
)(InvoiceDetailActionsBar);
