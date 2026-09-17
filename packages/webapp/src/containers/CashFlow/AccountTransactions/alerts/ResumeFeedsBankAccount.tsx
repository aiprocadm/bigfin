import intl from 'react-intl-universal';
import React from 'react';
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

import { useResumeFeedsBankAccount } from '@/hooks/query/bank-accounts';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

type ResumeFeedsBankAccountAlertProps = AlertReduxProps<{
  bankAccountId: number;
}> &
  WithAlertActionsProps;

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
}: ResumeFeedsBankAccountAlertProps) {
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
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  // Подписи кнопок у `Alert` — строки, не элементы; текст вопроса раньше был
  // английским прямо в разметке (Д7 карты v85).
  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('cashflow.alert.resume_bank_feeds')}
      intent={Intent.SUCCESS}
      isOpen={isOpen}
      onCancel={handleCancelActivateItem}
      loading={isLoading}
      onConfirm={handleConfirmItemActivate}
    >
      <p>{intl.get('cashflow.alert.resume_bank_feeds.body')}</p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(ResumeFeedsBankAccountAlert);
