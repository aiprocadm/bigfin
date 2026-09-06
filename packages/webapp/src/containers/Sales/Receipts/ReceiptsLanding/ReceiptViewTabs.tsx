// @ts-nocheck
import React from 'react';
import { Alignment, Navbar, NavbarGroup } from '@blueprintjs/core';

import { DashboardViewsTabs } from '@/components';
import { withReceiptsActions } from './withReceiptsActions';
import { withReceipts } from './withReceipts';

import { compose, transfromViewsToTabs } from '@/utils';
import { useReceiptsListContext } from './ReceiptsListProvider';

/**
 * Receipts views tabs.
 */
function ReceiptViewTabs({
  // #withReceiptsActions
  setReceiptsTableState,

  // #withReceipts
  receiptsCurrentView,
}) {
  // Receipts list context.
  const { receiptsViews } = useReceiptsListContext();

  const tabs = transfromViewsToTabs(receiptsViews);

  // Handles the active tab chaning.
  const handleTabsChange = (viewSlug) => {
    setReceiptsTableState({
      viewSlug: viewSlug || null,
    });
  };

  return (
    <Navbar className={'navbar--dashboard-views'}>
      <NavbarGroup align={Alignment.LEFT}>
        <DashboardViewsTabs
          currentViewSlug={receiptsCurrentView}
          tabs={tabs}
          resourceName={'receipts'}
          onChange={handleTabsChange}
        />
      </NavbarGroup>
    </Navbar>
  );
}

export default compose(
  withReceiptsActions,
  withReceipts(({ receiptTableState }) => ({
    receiptsCurrentView: receiptTableState.viewSlug,
  })),
)(ReceiptViewTabs);
