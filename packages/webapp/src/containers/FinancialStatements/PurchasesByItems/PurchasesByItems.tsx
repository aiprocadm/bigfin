// @ts-nocheck
import React, { useEffect, useCallback } from 'react';
import moment from 'moment';

// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси PurchasesByItemsHeader/PurchasesByItemsActionsBar остаются на месте (не удаляем).
import { PurchasesByItemsHeaderV2 } from './v2/PurchasesByItemsHeaderV2';
import { PurchasesByItemsToolbarV2 } from './v2/PurchasesByItemsToolbarV2';

import { FinancialStatement, DashboardPageContent } from '@/components';
import { PurchasesByItemsLoadingBar } from './components';
import { PurchasesByItemsProvider } from './PurchasesByItemsProvider';
import { PurchasesByItemsBody } from './PurchasesByItemsBody';
import { usePurchasesByItemsQuery } from './utils';
import { compose } from '@/utils';

import { withPurchasesByItemsActions } from './withPurchasesByItemsActions';
import { PurchasesByItemsDialogs } from './PurchasesByItemsDialogs';

/**
 * Purchases by items.
 */
function PurchasesByItems({
  // #withPurchasesByItemsActions
  togglePurchasesByItemsFilterDrawer,
}) {
  const { query, setLocationQuery } = usePurchasesByItemsQuery();

  // Handle filter form submit.
  const handleFilterSubmit = useCallback(
    (filter) => {
      const parsedFilter = {
        ...filter,
        fromDate: moment(filter.fromDate).format('YYYY-MM-DD'),
        toDate: moment(filter.toDate).format('YYYY-MM-DD'),
      };
      setLocationQuery(parsedFilter);
    },
    [setLocationQuery],
  );
  // Handle number format form submit.
  const handleNumberFormatSubmit = (numberFormat) => {
    setFilter({
      ...filter,
      numberFormat,
    });
  };
  // Hide the filter drawer once the page unmount.
  useEffect(
    () => () => {
      togglePurchasesByItemsFilterDrawer(false);
    },
    [togglePurchasesByItemsFilterDrawer],
  );

  return (
    <PurchasesByItemsProvider query={query}>
      <PurchasesByItemsToolbarV2
        numberFormat={query.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <PurchasesByItemsLoadingBar />

      <DashboardPageContent>
        <FinancialStatement>
          <PurchasesByItemsHeaderV2
            pageFilter={query}
            onSubmitFilter={handleFilterSubmit}
          />
          <PurchasesByItemsBody />
        </FinancialStatement>
      </DashboardPageContent>

      <PurchasesByItemsDialogs />
    </PurchasesByItemsProvider>
  );
}

export default compose(withPurchasesByItemsActions)(PurchasesByItems);
