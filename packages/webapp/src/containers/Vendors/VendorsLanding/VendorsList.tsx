// @ts-nocheck
import React, { useEffect } from 'react';

import '@/style/pages/Vendors/List.scss';

import { DashboardPageContent } from '@/components';

import { VendorsListProvider } from './VendorsListProvider';
import { VendorsToolbarV2 } from './v2/VendorsToolbarV2';
import { VendorsTableV2 } from './v2/VendorsTableV2';

import { withVendors } from './withVendors';
import { withVendorsActions } from './withVendorsActions';

import { compose } from '@/utils';

/**
 * Vendors list page.
 */
function VendorsList({
  // #withVendors
  vendorsTableState,
  vendorsTableStateChanged,

  // #withVendorsActions
  resetVendorsTableState,
  resetVendorsSelectedRows,
}) {
  // Resets the vendors table state once the page unmount.
  useEffect(
    () => () => {
      resetVendorsTableState();
      resetVendorsSelectedRows();
    },
    [resetVendorsSelectedRows, resetVendorsTableState],
  );

  return (
    <VendorsListProvider
      tableState={vendorsTableState}
      tableStateChanged={vendorsTableStateChanged}
    >
      <VendorsToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <VendorsTableV2 />
        </div>
      </DashboardPageContent>
    </VendorsListProvider>
  );
}

export default compose(
  withVendors(({ vendorsTableState, vendorsTableStateChanged }) => ({
    vendorsTableState,
    vendorsTableStateChanged,
  })),
  withVendorsActions,
)(VendorsList);
