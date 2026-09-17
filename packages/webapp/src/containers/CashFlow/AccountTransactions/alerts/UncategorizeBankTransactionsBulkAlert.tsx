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

import { useUncategorizeTransactionsBulkAction } from '@/hooks/query/bank-transactions';
import { compose } from '@/utils';

type UncategorizeBankTransactionsBulkAlertProps = AlertReduxProps<{
  uncategorizeTransactionsIds: number[];
}> &
  WithAlertActionsProps;

/**
 * Uncategorize bank account transactions in build alert.
 */
function UncategorizeBankTransactionsBulkAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { uncategorizeTransactionsIds },

  // #withAlertActions
  closeAlert,
}: UncategorizeBankTransactionsBulkAlertProps) {
  const { mutateAsync: uncategorizeTransactions, isLoading } =
    useUncategorizeTransactionsBulkAction();

  // Handle activate item alert cancel.
  const handleCancelActivateItem = () => {
    closeAlert(name);
  };

  // Handle confirm item activated.
  const handleConfirmItemActivate = () => {
    uncategorizeTransactions({ ids: uncategorizeTransactionsIds })
      .then(() => {
        AppToaster.show({
          message: intl.get('cashflow.notify.selected_transactions_uncategorized'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('cashflow.error.uncategorize_transactions'),
          intent: Intent.DANGER,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  };

  // Подписи кнопок у `Alert` — строки, не элементы; текст вопроса раньше был
  // английским прямо в разметке (Д7 карты v85).
  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('cashflow.alert.uncategorize_transactions')}
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancelActivateItem}
      loading={isLoading}
      onConfirm={handleConfirmItemActivate}
    >
      <p>{intl.get('cashflow.alert.uncategorize_transactions.body')}</p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(UncategorizeBankTransactionsBulkAlert);
