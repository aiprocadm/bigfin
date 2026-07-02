// @ts-nocheck
import React from 'react';
import { DashboardPageContent } from '@/components';

import '@/style/pages/SaleEstimate/List.scss';

import { EstimatesToolbarV2 } from './v2/EstimatesToolbarV2';
import { EstimatesTableV2 } from './v2/EstimatesTableV2';

import { withEstimates } from './withEstimates';
import { withEstimatesActions } from './withEstimatesActions';

import { EstimatesListProvider } from './EstimatesListProvider';
import { compose, transformTableStateToQuery } from '@/utils';

/**
 * Sale estimates list page.
 */
function EstimatesList({
  // #withEstimate
  estimatesTableState,
  estimatesTableStateChanged,

  // #withEstimatesActions
  resetEstimatesTableState,
  setEstimatesSelectedRows,
}) {
  // Resets the estimates table state once the page unmount.
  React.useEffect(
    () => () => {
      resetEstimatesTableState();
      setEstimatesSelectedRows([]);
    },
    [resetEstimatesTableState, setEstimatesSelectedRows],
  );

  return (
    <EstimatesListProvider
      query={transformTableStateToQuery(estimatesTableState)}
      tableStateChanged={estimatesTableStateChanged}
    >
      <EstimatesToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <EstimatesTableV2 />
        </div>
      </DashboardPageContent>
    </EstimatesListProvider>
  );
}

export default compose(
  withEstimates(({ estimatesTableState, estimatesTableStateChanged }) => ({
    estimatesTableState,
    estimatesTableStateChanged,
  })),
  withEstimatesActions,
)(EstimatesList);
