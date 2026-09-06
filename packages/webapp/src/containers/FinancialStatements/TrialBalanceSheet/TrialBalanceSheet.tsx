import React, { useCallback, useEffect } from 'react';
import moment from 'moment';

import { DashboardPageContent } from '@/components';
import { TrialBalanceSheetBody } from './TrialBalanceSheetBody';
import { TrialBalanceSheetProvider } from './TrialBalanceProvider';
import { useTrialBalanceSheetQuery } from './utils';
import TrialBalanceActionsBar from './TrialBalanceActionsBar';

// D-redesign: панель настроек на общем shadcn-каркасе (v2, тираж пилота ОПиУ).
// Легаси TrialBalanceSheetHeader остаётся на месте (не удаляем).
import { TrialBalanceSheetHeaderV2 } from './v2/TrialBalanceSheetHeaderV2';

import {
  TrialBalanceSheetAlerts,
  TrialBalanceSheetLoadingBar,
} from './components';

import { withTrialBalanceActions } from './withTrialBalanceActions';
import { compose } from '@/utils';
import { TrialBalanceSheetDialogs } from './TrialBalanceSheetDialogs';

/**
 * Trial balance sheet.
 */
function TrialBalanceSheet({
  // #withTrialBalanceSheetActions
  toggleTrialBalanceFilterDrawer: toggleFilterDrawer,
}: any) {
  const { query, setLocationQuery } = useTrialBalanceSheetQuery();

  // Handle filter form submit.
  const handleFilterSubmit = useCallback(
    (filter: any) => {
      const parsedFilter = {
        ...filter,
        fromDate: moment(filter.fromDate).format('YYYY-MM-DD'),
        toDate: moment(filter.toDate).format('YYYY-MM-DD'),
      };
      setLocationQuery(parsedFilter);
    },
    [setLocationQuery],
  );
  // Handle numebr format form submit.
  const handleNumberFormatSubmit = (numberFormat: any) => {
    setLocationQuery({
      ...query,
      numberFormat,
    });
  };
  // Hide the filter drawer once the page unmount.
  useEffect(
    () => () => {
      toggleFilterDrawer(false);
    },
    [toggleFilterDrawer],
  );

  return (
    <TrialBalanceSheetProvider query={query}>
      <TrialBalanceActionsBar
        numberFormat={query.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <TrialBalanceSheetLoadingBar />
      <TrialBalanceSheetAlerts />

      <DashboardPageContent>
        <TrialBalanceSheetHeaderV2
          pageFilter={query}
          onSubmitFilter={handleFilterSubmit}
        />
        <TrialBalanceSheetBody />
      </DashboardPageContent>

      <TrialBalanceSheetDialogs />
    </TrialBalanceSheetProvider>
  );
}

export default compose(withTrialBalanceActions)(TrialBalanceSheet);
