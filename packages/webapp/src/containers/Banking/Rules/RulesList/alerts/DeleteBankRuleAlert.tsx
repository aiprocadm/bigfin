import React from 'react';
import intl from 'react-intl-universal';
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

import { useDeleteBankRule } from '@/hooks/query/bank-rules';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

type BankRuleDeleteAlertProps = AlertReduxProps<{ id: number }> &
  WithAlertActionsProps &
  WithDrawerActionsProps;

/**
 * Project delete alert.
 */
function BankRuleDeleteAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { id },

  // #withAlertActions
  closeAlert,
}: BankRuleDeleteAlertProps) {
  const { mutateAsync: deleteBankRule, isLoading } = useDeleteBankRule();

  // handle cancel delete project alert.
  const handleCancelDeleteAlert = () => {
    closeAlert(name);
  };

  // handleConfirm delete project
  const handleConfirmBtnClick = () => {
    deleteBankRule(id)
      .then(() => {
        AppToaster.show({
          message: intl.get('banking.rules.deleted_successfully'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch(showApiError);
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('delete')}
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancelDeleteAlert}
      onConfirm={handleConfirmBtnClick}
      loading={isLoading}
    >
      <p>{intl.get('banking.rules.delete_alert.message')}</p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
  withDrawerActions,
)(BankRuleDeleteAlert);
