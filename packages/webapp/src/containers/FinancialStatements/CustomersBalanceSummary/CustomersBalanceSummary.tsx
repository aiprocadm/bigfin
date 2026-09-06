import React, { useEffect } from 'react';
import moment from 'moment';
import * as R from 'ramda';

import { FinancialStatement, DashboardPageContent } from '@/components';

// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси CustomersBalanceSummaryHeader/ActionsBar остаются на месте (не удаляем).
import { CustomersBalanceSummaryHeaderV2 } from './v2/CustomersBalanceSummaryHeaderV2';
import { CustomersBalanceSummaryToolbarV2 } from './v2/CustomersBalanceSummaryToolbarV2';

import { CustomerBalanceSummaryBody } from './CustomerBalanceSummaryBody';
import { CustomersBalanceSummaryProvider } from './CustomersBalanceSummaryProvider';
import { useCustomerBalanceSummaryQuery } from './utils';
import { CustomersBalanceLoadingBar } from './components';
import { withCustomersBalanceSummaryActions } from './withCustomersBalanceSummaryActions';
import { CustomerBalanceSummaryPdfDialog } from './CustomerBalancePdfDialog';
import { DialogsName } from '@/constants/dialogs';

/**
 * Customers Balance summary.
 */
function CustomersBalanceSummary({
  // #withCustomersBalanceSummaryActions
  toggleCustomerBalanceFilterDrawer,
}: any) {
  const { query, setLocationQuery } = useCustomerBalanceSummaryQuery();

  // Handle re-fetch customers balance summary after filter change.
  const handleFilterSubmit = (filter: any) => {
    const _filter = {
      ...filter,
      asDate: moment(filter.asDate).format('YYYY-MM-DD'),
    };
    setLocationQuery({ ..._filter });
  };
  // Handle number format.
  const handleNumberFormat = (values: any) => {
    setLocationQuery({
      ...query,
      numberFormat: values,
    });
  };

  useEffect(
    () => () => toggleCustomerBalanceFilterDrawer(false),
    [toggleCustomerBalanceFilterDrawer],
  );

  return (
    <CustomersBalanceSummaryProvider filter={query}>
      <CustomersBalanceSummaryToolbarV2
        numberFormat={query?.numberFormat}
        onNumberFormatSubmit={handleNumberFormat}
      />
      <CustomersBalanceLoadingBar />

      <DashboardPageContent>
        <FinancialStatement>
          <CustomersBalanceSummaryHeaderV2
            pageFilter={query}
            onSubmitFilter={handleFilterSubmit}
          />
          <CustomerBalanceSummaryBody />
        </FinancialStatement>
      </DashboardPageContent>

      <CustomerBalanceSummaryPdfDialog
        dialogName={DialogsName.CustomerBalanceSummaryPdfPreview}
      />
    </CustomersBalanceSummaryProvider>
  );
}
export default R.compose(withCustomersBalanceSummaryActions)(
  CustomersBalanceSummary,
);
