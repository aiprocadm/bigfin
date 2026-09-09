import React, { useEffect } from 'react';
import moment from 'moment';

import { FinancialStatement, DashboardPageContent } from '@/components';

// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси VendorsBalanceSummaryHeader/ActionsBar остаются на месте (не удаляем).
import { VendorsBalanceSummaryHeaderV2 } from './v2/VendorsBalanceSummaryHeaderV2';
import { VendorsBalanceSummaryToolbarV2 } from './v2/VendorsBalanceSummaryToolbarV2';

import { VendorsBalanceSummaryProvider } from './VendorsBalanceSummaryProvider';
import { VendorsSummarySheetLoadingBar } from './components';
import { VendorBalanceSummaryBody } from './VendorsBalanceSummaryBody';

import { withVendorsBalanceSummaryActions } from './withVendorsBalanceSummaryActions';

import { useVendorsBalanceSummaryQuery } from './utils';
import { VendorBalanceDialogs } from './VendorBalanceDialogs';
import { compose } from '@/utils';

/**
 * Vendors Balance summary.
 */
function VendorsBalanceSummary({
  // #withVendorsBalanceSummaryActions
  toggleVendorSummaryFilterDrawer,
}: {
  toggleVendorSummaryFilterDrawer: (open?: boolean) => void;
}) {
  const { query, setLocationQuery } = useVendorsBalanceSummaryQuery();

  // Handle refetch vendors balance summary.
  const handleFilterSubmit = (filter: Record<string, any>) => {
    const _filter = {
      ...filter,
      asDate: moment(filter.asDate).format('YYYY-MM-DD'),
    };
    setLocationQuery(_filter);
  };

  // Handle number format submit.
  const handleNumberFormatSubmit = (format: Record<string, any>) => {
    setLocationQuery({
      ...query,
      numberFormat: format,
    });
  };

  useEffect(
    () => () => toggleVendorSummaryFilterDrawer(false),
    [toggleVendorSummaryFilterDrawer],
  );

  return (
    <VendorsBalanceSummaryProvider filter={query}>
      <VendorsBalanceSummaryToolbarV2
        numberFormat={query?.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <VendorsSummarySheetLoadingBar />

      <DashboardPageContent>
        <FinancialStatement>
          <VendorsBalanceSummaryHeaderV2
            pageFilter={query}
            onSubmitFilter={handleFilterSubmit}
          />
          <VendorBalanceSummaryBody />
        </FinancialStatement>
      </DashboardPageContent>

      <VendorBalanceDialogs />
    </VendorsBalanceSummaryProvider>
  );
}

export default compose(withVendorsBalanceSummaryActions)(VendorsBalanceSummary);
