import React from 'react';

import { DashboardPageContent } from '@/components';
import WarehouseTransfersActionsBar from './WarehouseTransfersActionsBar';
import { WarehouseTransfersTableV2 } from './v2/WarehouseTransfersTableV2';
import { withWarehouseTransfers } from './withWarehouseTransfers';
import { withWarehouseTransfersActions } from './withWarehouseTransfersActions';

import { WarehouseTransfersListProvider } from './WarehouseTransfersListProvider';
import { transformTableStateToQuery, compose } from '@/utils';

function WarehouseTransfersList({
  // #withWarehouseTransfers
  warehouseTransferTableState,
  warehouseTransferTableStateChanged,

  // #withWarehouseTransfersActions
  resetWarehouseTransferTableState,
}: any) {
  // Resets the warehouse transfer table state once the page unmount.
  React.useEffect(
    () => () => {
      resetWarehouseTransferTableState();
    },
    [resetWarehouseTransferTableState],
  );

  return (
    <WarehouseTransfersListProvider
      query={transformTableStateToQuery(warehouseTransferTableState)}
      tableStateChanged={warehouseTransferTableStateChanged}
    >
      <WarehouseTransfersActionsBar />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <WarehouseTransfersTableV2 />
        </div>
      </DashboardPageContent>
    </WarehouseTransfersListProvider>
  );
}

export default compose(
  withWarehouseTransfersActions,
  withWarehouseTransfers(
    ({ warehouseTransferTableState, warehouseTransferTableStateChanged }: any) => ({
      warehouseTransferTableState,
      warehouseTransferTableStateChanged,
    }),
  ),
)(WarehouseTransfersList);
