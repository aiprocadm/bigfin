// @ts-nocheck
import React from 'react';
import * as R from 'ramda';
import intl from 'react-intl-universal';
import { Intent, Alert } from '@blueprintjs/core';
import { AppToaster, FormattedMessage as T } from '@/components';

import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withAlertActions } from '@/containers/Alert/withAlertActions';

import { useCancelMainSubscription } from '@/hooks/query/subscription';

/**
 * Cancel Unlocking partial transactions alerts.
 */
function CancelMainSubscriptionAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { module },

  // #withAlertActions
  closeAlert,
}) {
  const { mutateAsync: cancelSubscription, isLoading } =
    useCancelMainSubscription();

  // Handle cancel.
  const handleCancel = () => {
    closeAlert(name);
  };
  // Handle confirm.
  const handleConfirm = () => {
    const values = {
      module: module,
    };
    cancelSubscription()
      .then(() => {
        AppToaster.show({
          message: intl.get('subscription.alert.cancel_success'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(
        ({
          response: {
            data: { errors },
          },
        }) => {},
      )
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <Alert
      cancelButtonText={<T id={'cancel'} />}
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

      <p>
        It will no longer be accessible to you or any other users. Make sure any
        data has already been exported.
      </p>
    </Alert>
  );
}

export default R.compose(
  withAlertStoreConnect(),
  withAlertActions,
)(CancelMainSubscriptionAlert);
