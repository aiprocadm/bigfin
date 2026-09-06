import React from 'react';
import { DashboardPageContent } from '@/components';

import '@/style/pages/SaleReceipt/List.scss';

import { ReceiptsToolbarV2 } from './v2/ReceiptsToolbarV2';
import { ReceiptsTableV2 } from './v2/ReceiptsTableV2';

import { withReceipts } from './withReceipts';
import { withReceiptsActions } from './withReceiptsActions';

import { ReceiptsListProvider } from './ReceiptsListProvider';
import { transformTableStateToQuery, compose } from '@/utils';

/**
 * Receipts list page.
 */
function ReceiptsList({
  // #withReceipts
  receiptTableState,
  receiptsTableStateChanged,

  // #withReceiptsActions
  resetReceiptsTableState,
  setReceiptsSelectedRows,
}: any) {
  // Resets the receipts table state once the page unmount.
  React.useEffect(
    () => () => {
      resetReceiptsTableState();
      setReceiptsSelectedRows([]);
    },
    [resetReceiptsTableState, setReceiptsSelectedRows],
  );

  return (
    <ReceiptsListProvider
      query={transformTableStateToQuery(receiptTableState)}
      tableStateChanged={receiptsTableStateChanged}
    >
      <ReceiptsToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <ReceiptsTableV2 />
        </div>
      </DashboardPageContent>
    </ReceiptsListProvider>
  );
}

export default compose(
  withReceipts(({ receiptTableState, receiptsTableStateChanged }: any) => ({
    receiptTableState,
    receiptsTableStateChanged,
  })),
  withReceiptsActions,
)(ReceiptsList);
