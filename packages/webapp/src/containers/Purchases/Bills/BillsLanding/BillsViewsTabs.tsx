import React from 'react';

import { Alignment, Navbar, NavbarGroup } from '@blueprintjs/core';
import { DashboardViewsTabs } from '@/components';
import { useBillsListContext } from './BillsListProvider';

import { withBills } from './withBills';
import { withBillsActions } from './withBillsActions';

import { compose, transfromViewsToTabs } from '@/utils';

/**
 * Bills view tabs.
 */
function BillViewTabs({
  // #withBillsActions
  setBillsTableState,

  // #withBills
  billsCurrentView,
}: any) {
  // Bills list context.
  const { billsViews } = useBillsListContext();

  // Handle tab chaging.
  const handleTabsChange = (viewSlug: any) => {
    setBillsTableState({
      viewSlug: viewSlug || null,
    });
  };

  const tabs = transfromViewsToTabs(billsViews);

  return (
    <Navbar className={'navbar--dashboard-views'}>
      <NavbarGroup align={Alignment.LEFT}>
        <DashboardViewsTabs
          currentViewSlug={billsCurrentView}
          resourceName={'bills'}
          tabs={tabs}
          onChange={handleTabsChange}
        />
      </NavbarGroup>
    </Navbar>
  );
}

export default compose(
  withBillsActions,
  withBills(({ billsTableState }: any) => ({
    billsCurrentView: billsTableState.viewSlug,
  })),
)(BillViewTabs);
