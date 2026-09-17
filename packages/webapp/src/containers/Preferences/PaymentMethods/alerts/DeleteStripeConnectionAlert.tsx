import React from 'react';
import intl from 'react-intl-universal';
import { Intent, Alert } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import {
  withAlertStoreConnect,
  AlertReduxProps,
} from '@/containers/Alert/withAlertStoreConnect';
import {
  withAlertActions,
  WithAlertActionsProps,
} from '@/containers/Alert/withAlertActions';
import { useDeletePaymentMethod } from '@/hooks/query/payment-services';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

type DeleteStripeAccountAlertProps = AlertReduxProps<{
  paymentMethodId: number;
}> &
  WithAlertActionsProps;

/**
 * Delete Stripe connection alert.
 */
function DeleteStripeAccountAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { paymentMethodId },

  // #withAlertActions
  closeAlert,
}: DeleteStripeAccountAlertProps) {
  const { isLoading, mutateAsync: deletePaymentMethod } =
    useDeletePaymentMethod();

  // Handle cancel open bill alert.
  const handleCancelOpenBill = () => {
    closeAlert(name);
  };
  // Handle confirm bill open.
  const handleConfirmBillOpen = () => {
    deletePaymentMethod({ paymentMethodId })
      .then(() => {
        AppToaster.show({
          message: intl.get('preferences.payment_methods.stripe.deleted_successfully'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch((error: unknown) => {
        // Раньше отказ показывался ЗЕЛЁНЫМ уведомлением «что-то пошло не
        // так» — с видом успеха. Теперь — причина от сервера, как у соседних
        // предупреждений (Д1 карты v87).
        closeAlert(name);
        showApiError(error);
      });
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('delete_account')}
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancelOpenBill}
      onConfirm={handleConfirmBillOpen}
      loading={isLoading}
    >
      <p>{intl.get('preferences.payment_methods.stripe.delete_alert.message')}</p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(DeleteStripeAccountAlert);
