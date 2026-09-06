// @ts-nocheck
import React, { useEffect, useCallback } from 'react';
import moment from 'moment';

import { SalesByItemsBody } from './SalesByItemsBody';
import { SalesByItemProvider } from './SalesByItemProvider';
import { SalesByItemsLoadingBar } from './components';
import { FinancialStatement, DashboardPageContent } from '@/components';
// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси SalesByItemsHeader/SalesByItemsActionsBar остаются на месте (не удаляем).
import { SalesByItemsHeaderV2 } from './v2/SalesByItemsHeaderV2';
import { SalesByItemsToolbarV2 } from './v2/SalesByItemsToolbarV2';

import { withSalesByItemsActions } from './withSalesByItemsActions';

import { useSalesByItemsQuery } from './utils';
import { compose } from '@/utils';
import { SalesByItemsDialogs } from './SalesByitemsDialogs';

/**
 * Sales by items.
 */
function SalesByItems({
  // #withSellsByItemsActions
  toggleSalesByItemsFilterDrawer,
}) {
  const { query, setLocationQuery } = useSalesByItemsQuery();

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
    setLocationQuery({
      ...query,
      numberFormat,
    });
  };
  // Hide the filter drawer once the page unmount.
  useEffect(
    () => () => toggleSalesByItemsFilterDrawer(false),
    [toggleSalesByItemsFilterDrawer],
  );

  return (
    <SalesByItemProvider query={query}>
      <SalesByItemsToolbarV2
        numberFormat={query.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <SalesByItemsLoadingBar />

      <DashboardPageContent>
        <FinancialStatement>
          <SalesByItemsHeaderV2
            pageFilter={query}
            onSubmitFilter={handleFilterSubmit}
          />
          <SalesByItemsBody />
        </FinancialStatement>
      </DashboardPageContent>

      <SalesByItemsDialogs />
    </SalesByItemProvider>
  );
}

export default compose(withSalesByItemsActions)(SalesByItems);
