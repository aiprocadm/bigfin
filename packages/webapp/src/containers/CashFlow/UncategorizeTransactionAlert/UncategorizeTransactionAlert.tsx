// @ts-nocheck
import intl from 'react-intl-universal';
import React from 'react';
import { Intent, Alert } from '@blueprintjs/core';
import { FormattedMessage as T } from '@/components';
import { AppToaster } from '@/components';

import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';

import { useUncategorizeTransaction } from '@/hooks/query';
import { compose } from '@/utils';
import { DRAWERS } from '@/constants/drawers';

/**
 * Project delete alert.
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
}) {
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
      .catch(
        ({
          response: {
            data: { errors },
          },
        }) => {
          AppToaster.show({
            message: intl.get('something_wentwrong'),
            intent: Intent.DANGER,
          });
        },
      );
  };

  return (
    <Alert
      cancelButtonText={<T id={'cancel'} />}
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
