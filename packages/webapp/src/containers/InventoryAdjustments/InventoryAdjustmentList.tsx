// @ts-nocheck
import React from 'react';

import '@/style/pages/InventoryAdjustments/List.scss';

import { DashboardPageContent } from '@/components';

import { InventoryAdjustmentsProvider } from './InventoryAdjustmentsProvider';
import { InventoryAdjustmentTableV2 } from './v2/InventoryAdjustmentTableV2';

import { withInventoryAdjustments } from './withInventoryAdjustments';

import { compose, transformTableStateToQuery } from '@/utils';

/**
 * Inventory Adjustment List.
 */
function InventoryAdjustmentList({
  // #withInventoryAdjustments
  inventoryAdjustmentTableState,
}) {
  return (
    <InventoryAdjustmentsProvider
      query={transformTableStateToQuery(inventoryAdjustmentTableState)}
    >
      <DashboardPageContent>
        <div className="bigfin-ui">
          <InventoryAdjustmentTableV2 />
        </div>
      </DashboardPageContent>
    </InventoryAdjustmentsProvider>
  );
}

export default compose(
  withInventoryAdjustments(({ inventoryAdjustmentTableState }) => ({
    inventoryAdjustmentTableState,
  })),
)(InventoryAdjustmentList);
