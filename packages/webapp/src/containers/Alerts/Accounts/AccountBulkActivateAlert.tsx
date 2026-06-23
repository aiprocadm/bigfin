// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { Intent, Alert } from '@blueprintjs/core';
import { FormattedMessage as T, AppToaster } from '@/components';

import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { useBulkActivateAccounts } from '@/hooks/query/accounts';

import { compose } from '@/utils';

function AccountBulkActivateAlert({
  name,
  isOpen,
  payload: { accountsIds },

  // #withAlertActions
  closeAlert,
}) {
  const { mutateAsync: bulkActivateAccounts, isLoading } =
    useBulkActivateAccounts();
  const selectedRowsCount = accountsIds?.length || 0;

  // Handle alert cancel.
  const handleClose = () => {
    closeAlert(name);
  };

  // Handle Bulk activate account confirm.
  const handleConfirmBulkActivate = () => {
    bulkActivateAccounts(accountsIds)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_accounts_has_been_successfully_activated'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('something_went_wrong'),
          intent: Intent.DANGER,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <Alert
      cancelButtonText={<T id={'cancel'} />}
      confirmButtonText={`${intl.get('activate')} (${selectedRowsCount})`}
      intent={Intent.WARNING}
      isOpen={isOpen}
      onCancel={handleClose}
      onConfirm={handleConfirmBulkActivate}
      loading={isLoading}
    >
      <p>
        <T id={'are_sure_to_activate_this_accounts'} />
      </p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(AccountBulkActivateAlert);
