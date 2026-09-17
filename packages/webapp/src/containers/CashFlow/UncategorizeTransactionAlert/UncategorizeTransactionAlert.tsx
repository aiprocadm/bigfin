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
import {
  withDrawerActions,
  WithDrawerActionsProps,
} from '@/containers/Drawer/withDrawerActions';

import { useUncategorizeTransaction } from '@/hooks/query';
import { compose } from '@/utils';
import { DRAWERS } from '@/constants/drawers';
import { showApiError } from '@/utils/showApiError';

type UncategorizeTransactionAlertProps = AlertReduxProps<{
  uncategorizedTransactionId: number;
}> &
  WithAlertActionsProps &
  WithDrawerActionsProps;

/**
 * Предупреждение «снять категорию с операции».
 */
function UncategorizeTransactionAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { uncategorizedTransactionId },

  // #withAlertActions
  closeAlert,

  // #withDrawerActions
  closeDrawer,
}: UncategorizeTransactionAlertProps) {
  const { mutateAsync: uncategorizeTransaction, isLoading } =
    useUncategorizeTransaction();

  // handle cancel delete project alert.
  const handleCancelDeleteAlert = () => {
    closeAlert(name);
  };

  // handleConfirm delete project
  const handleConfirmBtnClick = () => {
    uncategorizeTransaction(uncategorizedTransactionId)
      .then(() => {
        AppToaster.show({
          message: intl.get('cashflow.notify.transaction_uncategorized'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
        closeDrawer(DRAWERS.CASHFLOW_TRNASACTION_DETAILS);
      })
      .catch(showApiError);
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('cashflow.alert.uncategorize')}
      intent={Intent.WARNING}
      isOpen={isOpen}
      onCancel={handleCancelDeleteAlert}
      onConfirm={handleConfirmBtnClick}
      loading={isLoading}
    >
      <p>{intl.get('cashflow.alert.uncategorize_transaction_confirm')}</p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
  withDrawerActions,
)(UncategorizeTransactionAlert);
