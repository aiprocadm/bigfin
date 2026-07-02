// @ts-nocheck
import { useEffect, useCallback } from 'react';
import moment from 'moment';

import { DashboardPageContent } from '@/components';
// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси InventoryValuationHeader/InventoryValuationActionsBar остаются на месте (не удаляем).
import { InventoryValuationHeaderV2 } from './v2/InventoryValuationHeaderV2';
import { InventoryValuationToolbarV2 } from './v2/InventoryValuationToolbarV2';

import { InventoryValuationProvider } from './InventoryValuationProvider';
import { InventoryValuationBody } from './InventoryValuationBody';
import { InventoryValuationLoadingBar } from './components';
import { useInventoryValuationQuery } from './utils';
import { compose } from '@/utils';

import { withInventoryValuationActions } from './withInventoryValuationActions';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { InventoryValuationDialogs } from './InventoryValuationDialogs';

/**
 * Inventory valuation.
 */
function InventoryValuation({
  // #withInventoryValuationActions
  toggleInventoryValuationFilterDrawer,
}) {
  const { query, setLocationQuery } = useInventoryValuationQuery();

  // Handle filter form submit.
  const handleFilterSubmit = useCallback(
    (filter) => {
      const newFilter = {
        ...filter,
        asDate: moment(filter.asDate).format('YYYY-MM-DD'),
      };
      setLocationQuery(newFilter);
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
    () => () => {
      toggleInventoryValuationFilterDrawer(false);
    },
    [toggleInventoryValuationFilterDrawer],
  );

  return (
    <InventoryValuationProvider query={query}>
      <InventoryValuationToolbarV2
        numberFormat={query.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <InventoryValuationLoadingBar />

      <DashboardPageContent>
        <InventoryValuationHeaderV2
          pageFilter={query}
          onSubmitFilter={handleFilterSubmit}
        />
        <InventoryValuationBody />
      </DashboardPageContent>

      <InventoryValuationDialogs />
    </InventoryValuationProvider>
  );
}

export default compose(
  withInventoryValuationActions,
  withCurrentOrganization(({ organization }) => ({
    organizationName: organization.name,
  })),
)(InventoryValuation);
