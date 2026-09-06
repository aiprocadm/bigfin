import React, { useEffect } from 'react';
import moment from 'moment';

import { DashboardPageContent } from '@/components';
import { CashFlowStatementBody } from './CashFlowStatementBody';
import { CashFlowStatementProvider } from './CashFlowStatementProvider';

// D-redesign: панель настроек на общем shadcn-каркасе (v2, тираж пилота ОПиУ).
// Легаси CashFlowStatementHeader остаётся на месте (не удаляем).
import { CashFlowStatementHeaderV2 } from './v2/CashFlowStatementHeaderV2';
import CashFlowStatementActionsBar from './CashFlowStatementActionsBar';

import { withCashFlowStatementActions } from './withCashFlowStatementActions';
import {
  CashFlowStatementLoadingBar,
  CashFlowStatementAlerts,
} from './components';

import { useCashflowStatementQuery } from './utils';
import { compose } from '@/utils';
import { CashflowSheetDialogs } from './CashflowSheetDialogs';

/**
 * Cash flow statement.
 * @returns {JSX.Element}
 */
function CashFlowStatement({
  // # withCashStatementActions
  toggleCashFlowStatementFilterDrawer,
}: any) {
  // Cashflow statement query.
  const { query, setLocationQuery } = useCashflowStatementQuery();

  // Handle refetch cash flow after filter change.
  const handleFilterSubmit = (filter: any) => {
    const newFilter = {
      ...filter,
      fromDate: moment(filter.fromDate).format('YYYY-MM-DD'),
      toDate: moment(filter.toDate).format('YYYY-MM-DD'),
    };
    setLocationQuery({ ...newFilter });
  };
  // Handle format number submit.
  const handleNumberFormatSubmit = (values: any) => {
    setLocationQuery({
      ...query,
      numberFormat: values,
    });
  };

  useEffect(
    () => () => {
      toggleCashFlowStatementFilterDrawer(false);
    },
    [toggleCashFlowStatementFilterDrawer],
  );

  return (
    <CashFlowStatementProvider filter={query}>
      <CashFlowStatementActionsBar
        numberFormat={query.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <CashFlowStatementLoadingBar />
      <CashFlowStatementAlerts />

      <DashboardPageContent>
        <CashFlowStatementHeaderV2
          pageFilter={query}
          onSubmitFilter={handleFilterSubmit}
        />
        <CashFlowStatementBody />
      </DashboardPageContent>

      <CashflowSheetDialogs />
    </CashFlowStatementProvider>
  );
}

export default compose(withCashFlowStatementActions)(CashFlowStatement);
