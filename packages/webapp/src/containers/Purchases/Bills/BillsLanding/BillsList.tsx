// @ts-nocheck
import React, { useEffect } from 'react';
import { DashboardPageContent } from '@/components';

import '@/style/pages/Bills/List.scss';

import { BillsListProvider } from './BillsListProvider';

import { BillsToolbarV2 } from './v2/BillsToolbarV2';
import { BillsTableV2 } from './v2/BillsTableV2';

import { withBills } from './withBills';
import { withBillsActions } from './withBillsActions';

import { transformTableStateToQuery, compose } from '@/utils';

/**
 * Bills list.
 */
function BillsList({
  // #withBills
  billsTableState,
  billsTableStateChanged,

  // #withBillsActions
  resetBillsTableState,
  setBillsSelectedRows,
}) {
  // Resets the bills table state and selection once the page unmount.
  useEffect(
    () => () => {
      resetBillsTableState();
      setBillsSelectedRows([]);
    },
    [resetBillsTableState, setBillsSelectedRows],
  );

  return (
    <BillsListProvider
      query={transformTableStateToQuery(billsTableState)}
      tableStateChanged={billsTableStateChanged}
    >
      <BillsToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <BillsTableV2 />
        </div>
      </DashboardPageContent>
    </BillsListProvider>
  );
}

export default compose(
  withBills(({ billsTableState, billsTableStateChanged }) => ({
    billsTableState,
    billsTableStateChanged,
  })),
  withBillsActions,
)(BillsList);
