import React from 'react';
import intl from 'react-intl-universal';
import { Intent, Alert } from '@blueprintjs/core';
import { FormattedMessage as T } from '@/components';

import {
  withAlertActions,
  WithAlertActionsProps,
} from '@/containers/Alert/withAlertActions';
import {
  withAlertStoreConnect,
  AlertReduxProps,
} from '@/containers/Alert/withAlertStoreConnect';

import { compose, saveInvoke } from '@/utils';

type ChangingFullAmountAlertProps = AlertReduxProps &
  WithAlertActionsProps & {
    /** Что делать, когда человек согласился. Передаёт форма платежа. */
    onConfirm?: (event: React.SyntheticEvent<HTMLElement>) => void;
  };

/**
 * Changing full-amount alert in payment made form.
 */
function ChangingFullAmountAlert({
  name,
  onConfirm,

  // #withAlertStoreConnect
  isOpen,

  // #withAlertActions
  closeAlert,
}: ChangingFullAmountAlertProps) {
  // Handle the alert cancel.
  const handleCancel = () => {
    closeAlert(name);
  };

  // Handle confirm delete manual journal.
  const handleConfirm = (event: React.SyntheticEvent<HTMLElement>) => {
    closeAlert(name);
    saveInvoke(onConfirm, event);
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('ok')}
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
