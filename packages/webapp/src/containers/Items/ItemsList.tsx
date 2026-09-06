import React from 'react';
import { compose } from '@/utils';

import '@/style/pages/Items/List.scss';

import { DashboardPageContent } from '@/components';
import { ItemsListProvider } from './ItemsListProvider';

import { ItemsToolbarV2 } from './v2/ItemsToolbarV2';
import { ItemsTableV2 } from './v2/ItemsTableV2';

import { withItems } from './withItems';
import { withItemsActions } from './withItemsActions';

/**
 * Items list.
 */
function ItemsList({
  // #withItems
  itemsTableState,
  itemsTableStateChanged,

  // #withItemsActions
  resetItemsTableState,
  setItemsSelectedRows,
}: any) {
  // Resets items table query state once the page unmount.
  React.useEffect(
    () => () => {
      resetItemsTableState();
      setItemsSelectedRows([]);
    },
    [resetItemsTableState, setItemsSelectedRows],
  );

  return (
    <ItemsListProvider
      tableState={itemsTableState}
      tableStateChanged={itemsTableStateChanged}
    >
      <ItemsToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <ItemsTableV2 />
        </div>
      </DashboardPageContent>
    </ItemsListProvider>
  );
}

export default compose(
  withItemsActions,
  withItems(({ itemsTableState, itemsTableStateChanged }: any) => ({
    itemsTableState,
    itemsTableStateChanged,
  })),
)(ItemsList);
