// @ts-nocheck
import React from 'react';
import moment from 'moment';
import * as R from 'ramda';

// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси ProfitLossSheetHeader/ProfitLossActionsBar остаются на месте (не удаляем).
import { ProfitLossHeaderV2 } from './v2/ProfitLossHeaderV2';
import { ProfitLossToolbarV2 } from './v2/ProfitLossToolbarV2';

import { DashboardPageContent } from '@/components';

import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withProfitLossActions } from './withProfitLossActions';

import { useProfitLossSheetQuery } from './utils';
import { ProfitLossSheetProvider } from './ProfitLossProvider';
import { ProfitLossSheetAlerts, ProfitLossSheetLoadingBar } from './components';
import { ProfitLossBody } from './ProfitLossBody';
import { ProfitLossSheetDialogs } from './ProfitLossSheetDialogs';

/**
 * Profit/Loss financial statement sheet.
 * @returns {React.JSX}
 */
function ProfitLossSheet({
  // #withProfitLossActions
  toggleProfitLossFilterDrawer: toggleDisplayFilterDrawer,
}) {
  // Profit/loss sheet query.
  const { query, setLocationQuery } = useProfitLossSheetQuery();

  // Handle submit filter.
  const handleSubmitFilter = (filter) => {
    const newFilter = {
      ...filter,
      fromDate: moment(filter.fromDate).format('YYYY-MM-DD'),
      toDate: moment(filter.toDate).format('YYYY-MM-DD'),
    };
    setLocationQuery(newFilter);
  };
  // Handle number format submit.
  const handleNumberFormatSubmit = (numberFormat) => {
    setLocationQuery({
      ...query,
      numberFormat,
    });
  };
  // Hide the filter drawer once the page unmount.
  React.useEffect(
    () => () => {
      toggleDisplayFilterDrawer(false);
    },
    [toggleDisplayFilterDrawer],
  );

  return (
    <ProfitLossSheetProvider query={query}>
      <ProfitLossToolbarV2
        numberFormat={query.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <ProfitLossSheetLoadingBar />
      <ProfitLossSheetAlerts />

      <DashboardPageContent>
        <ProfitLossHeaderV2
          pageFilter={query}
          onSubmitFilter={handleSubmitFilter}
        />
        <ProfitLossBody />
      </DashboardPageContent>

      <ProfitLossSheetDialogs />
    </ProfitLossSheetProvider>
  );
}

export default R.compose(
  withDashboardActions,
  withProfitLossActions,
)(ProfitLossSheet);
