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

import { usePauseFeedsBankAccount } from '@/hooks/query/bank-accounts';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

type PauseFeedsBankAccountAlertProps = AlertReduxProps<{
  bankAccountId: number;
}> &
  WithAlertActionsProps;

/**
 * Pause feeds of the bank account alert.
 */
function PauseFeedsBankAccountAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { bankAccountId },

  // #withAlertActions
  closeAlert,
}: PauseFeedsBankAccountAlertProps) {
  const { mutateAsync: pauseBankAccountFeeds, isLoading } =
    usePauseFeedsBankAccount();

  // Handle activate item alert cancel.
  const handleCancelActivateItem = () => {
    closeAlert(name);
  };
  // Handle confirm item activated.
  const handleConfirmItemActivate = () => {
    pauseBankAccountFeeds({ bankAccountId })
      .then(() => {
        AppToaster.show({
          message: intl.get('cashflow.notify.bank_feeds_paused'),
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
      confirmButtonText={intl.get('cashflow.alert.pause_bank_feeds')}
      intent={Intent.WARNING}
      isOpen={isOpen}
      onCancel={handleCancelActivateItem}
      loading={isLoading}
      onConfirm={handleConfirmItemActivate}
    >
      <p>{intl.get('cashflow.alert.pause_bank_feeds.body')}</p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(PauseFeedsBankAccountAlert);
