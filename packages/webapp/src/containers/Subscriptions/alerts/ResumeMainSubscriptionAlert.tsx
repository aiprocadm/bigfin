// @ts-nocheck
import React from 'react';
import * as R from 'ramda';
import intl from 'react-intl-universal';
import { Intent, Alert } from '@blueprintjs/core';
import { AppToaster, FormattedMessage as T } from '@/components';

import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { useResumeMainSubscription } from '@/hooks/query/subscription';

/**
 * Resume Unlocking partial transactions alerts.
 */
function ResumeMainSubscriptionAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { module },

  // #withAlertActions
  closeAlert,
}) {
  const { mutateAsync: resumeSubscription, isLoading } =
    useResumeMainSubscription();

  // Handle cancel.
  const handleCancel = () => {
    closeAlert(name);
  };
  // Handle confirm.
  const handleConfirm = () => {
    const values = {
      module: module,
    };
    resumeSubscription()
      .then(() => {
        AppToaster.show({
          message: intl.get('subscription.alert.resume_success'),
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
      confirmButtonText={intl.get('subscription.alert.resume_button')}
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      loading={isLoading}
    >
      <p>
        <strong>{intl.get('subscription.alert.resume_description')}</strong>

        <p>
          Are you sure want to resume the subscription of this organization?
        </p>
      </p>
    </Alert>
  );
}

export default R.compose(
  withAlertStoreConnect(),
  withAlertActions,
)(ResumeMainSubscriptionAlert);
