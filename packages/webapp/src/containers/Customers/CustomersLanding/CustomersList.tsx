// @ts-nocheck
import React, { useEffect } from 'react';

import '@/style/pages/Customers/List.scss';

import { DashboardPageContent } from '@/components';

import { CustomersToolbarV2 } from './v2/CustomersToolbarV2';
import { CustomersTableV2 } from './v2/CustomersTableV2';
import { CustomersListProvider } from './CustomersListProvider';

import { withCustomers } from './withCustomers';
import { withCustomersActions } from './withCustomersActions';

import { compose } from '@/utils';

/**
 * Customers list.
 */
function CustomersList({
  // #withCustomers
  customersTableState,
  customersTableStateChanged,

  // #withCustomersActions
  resetCustomersTableState,
  resetCustomersSelectedRows,
}) {
  // Resets the accounts table state once the page unmount.
  useEffect(
    () => () => {
      resetCustomersTableState();
      resetCustomersSelectedRows();
    },
    [resetCustomersSelectedRows, resetCustomersTableState],
  );

  return (
    <CustomersListProvider
      tableState={customersTableState}
      tableStateChanged={customersTableStateChanged}
    >
      <CustomersToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <CustomersTableV2 />
        </div>
      </DashboardPageContent>
    </CustomersListProvider>
  );
}

export default compose(
  withCustomers(({ customersTableState, customersTableStateChanged }) => ({
    customersTableState,
    customersTableStateChanged,
  })),
  withCustomersActions,
)(CustomersList);
