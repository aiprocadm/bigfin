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

import { useCancelMainSubscription } from '@/hooks/query/subscription';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

type CancelMainSubscriptionAlertProps = AlertReduxProps<{}> &
  WithAlertActionsProps;

/**
 * Предупреждение «отменить подписку организации».
 *
 * Модуль подписок законсервирован (решение 27, карты v18 и v86), но код его
 * жив и обязан говорить правду: отказ сервера раньше глотался молча, а текст
 * под заголовком был английским прямо в разметке (Д5 карты v87).
 */
function CancelMainSubscriptionAlert({
  name,

  // #withAlertStoreConnect
  isOpen,

  // #withAlertActions
  closeAlert,
}: CancelMainSubscriptionAlertProps) {
  const { mutateAsync: cancelSubscription, isLoading } =
    useCancelMainSubscription();

  // Handle cancel.
  const handleCancel = () => {
    closeAlert(name);
  };
  // Handle confirm.
  const handleConfirm = () => {
    cancelSubscription()
      .then(() => {
        AppToaster.show({
          message: intl.get('subscription.alert.cancel_success'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('subscription.alert.cancel_button')}
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      loading={isLoading}
    >
      <p>
        <strong>{intl.get('subscription.alert.cancel_description')}</strong>
      </p>

      <p>{intl.get('subscription.alert.cancel_data_notice')}</p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(CancelMainSubscriptionAlert);
