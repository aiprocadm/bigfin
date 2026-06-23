// @ts-nocheck
import React from 'react';
import { FormattedMessage as T } from '@/components';
import intl from 'react-intl-universal';
import { Intent, Alert } from '@blueprintjs/core';
import { AppToaster } from '@/components';

import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { useBulkInactivateAccounts } from '@/hooks/query/accounts';

import { compose } from '@/utils';

function AccountBulkInactivateAlert({
  name,
  isOpen,
  payload: { accountsIds },

  closeAlert,
}) {
  const { mutateAsync: bulkInactivateAccounts, isLoading } =
    useBulkInactivateAccounts();
  const selectedRowsCount = accountsIds?.length || 0;

  // Handle alert cancel.
  const handleCancel = () => {
    closeAlert(name);
  };
  // Handle Bulk Inactive accounts confirm.
  const handleConfirmBulkInactive = () => {
    bulkInactivateAccounts(accountsIds)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_accounts_have_been_successfully_inactivated'),
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
      confirmButtonText={`${intl.get('inactivate')} (${selectedRowsCount})`}
      intent={Intent.WARNING}
      isOpen={isOpen}
      onCancel={handleCancel}
      onConfirm={handleConfirmBulkInactive}
      loading={isLoading}
    >
      <p>
        <T id={'are_sure_to_inactive_this_accounts'} />
      </p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
  // withAccountsActions,
)(AccountBulkInactivateAlert);
