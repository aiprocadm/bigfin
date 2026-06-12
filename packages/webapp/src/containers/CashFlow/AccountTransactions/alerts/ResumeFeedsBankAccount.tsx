// @ts-nocheck
import intl from 'react-intl-universal';
import React from 'react';
import { Intent, Alert } from '@blueprintjs/core';

import { AppToaster, FormattedMessage as T } from '@/components';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withAlertActions } from '@/containers/Alert/withAlertActions';

import { useResumeFeedsBankAccount } from '@/hooks/query/bank-accounts';
import { compose } from '@/utils';

/**
 * Resume bank account feeds alert. 
 */
function ResumeFeedsBankAccountAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { bankAccountId },

  // #withAlertActions
  closeAlert,
}) {
  const { mutateAsync: resumeFeedsBankAccount, isLoading } =
    useResumeFeedsBankAccount();

  // Handle activate item alert cancel.
  const handleCancelActivateItem = () => {
    closeAlert(name);
  };

  // Handle confirm item activated.
  const handleConfirmItemActivate = () => {
    resumeFeedsBankAccount({ bankAccountId })
      .then(() => {
        AppToaster.show({
          message: intl.get('cashflow.notify.bank_feeds_resumed'),
          intent: Intent.SUCCESS,
        });
      })
      .catch((error) => {})
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <Alert
      cancelButtonText={<T id={'cancel'} />}
      confirmButtonText={intl.get('cashflow.alert.resume_bank_feeds')}
      intent={Intent.SUCCESS}
      isOpen={isOpen}
      onCancel={handleCancelActivateItem}
      loading={isLoading}
      onConfirm={handleConfirmItemActivate}
    >
      <p>
        Are you sure want to resume bank feeds syncing of this bank account, you
        can always pause it again?
      </p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(ResumeFeedsBankAccountAlert);
