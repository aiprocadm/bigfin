import React, { useEffect } from 'react';

import '@/style/pages/Accounts/List.scss';

import { DashboardPageContent } from '@/components';
import { AccountsChartProvider } from './AccountsChartProvider';
import { AccountsToolbarV2 } from './v2/AccountsToolbarV2';
import { AccountsTableV2 } from './v2/AccountsTableV2';

import { withAccounts } from '@/containers/Accounts/withAccounts';
import { withAccountsTableActions } from './withAccountsTableActions';

import { transformAccountsStateToQuery } from './utils';
import { compose } from '@/utils';

/**
 * Accounts chart list.
 */
function AccountsChart({
  // #withAccounts
  accountsTableState,
  accountsTableStateChanged,

  // #withAccountsActions
  resetAccountsTableState,
  setAccountsSelectedRows,
}: any) {
  // Resets the accounts table state once the page unmount.
  useEffect(
    () => () => {
      resetAccountsTableState();
      setAccountsSelectedRows([]);
    },
    [resetAccountsTableState, setAccountsSelectedRows],
  );

  return (
    <AccountsChartProvider
      query={transformAccountsStateToQuery(accountsTableState)}
      tableStateChanged={accountsTableStateChanged}
    >
      <AccountsToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <AccountsTableV2 />
        </div>
      </DashboardPageContent>
    </AccountsChartProvider>
  );
}

export default compose(
  withAccounts(({ accountsTableState, accountsTableStateChanged }: any) => ({
    accountsTableState,
    accountsTableStateChanged,
  })),
  withAccountsTableActions,
)(AccountsChart);
