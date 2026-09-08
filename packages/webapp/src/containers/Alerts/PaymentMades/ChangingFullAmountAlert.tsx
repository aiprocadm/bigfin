// @ts-nocheck
import React from 'react';
import { Intent, Alert } from '@blueprintjs/core';
import { FormattedMessage as T } from '@/components';

import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';

import { compose, saveInvoke } from '@/utils';

/**
 * Changing full-amount alert in payment made form.
 */
function ChangingFullAmountAlert({
  name,
  onConfirm,

  // #withAlertStoreConnect
  isOpen,
  payload: {},

  // #withAlertActions
  closeAlert,
}) {
  // Handle the alert cancel.
  const handleCancel = () => {
    closeAlert(name);
  };

  // Handle confirm delete manual journal.
  const handleConfirm = (event) => {
    closeAlert(name);
    saveInvoke(onConfirm, event);
  };

  return (
    <Alert
      cancelButtonText={<T id={'cancel'} />}
      confirmButtonText={<T id={'ok'} />}
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    >
      <p>
        <T id={'change_full_amount.confirm'} />
      </p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(ChangingFullAmountAlert);
