import React, { useCallback, useEffect } from 'react';
import moment from 'moment';

import { FinancialStatement, DashboardPageContent } from '@/components';

// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси JournalHeader/JournalActionsBar остаются на месте (не удаляем).
import { JournalHeaderV2 } from './v2/JournalHeaderV2';
import { JournalToolbarV2 } from './v2/JournalToolbarV2';
import { JournalBody } from './JournalBody';
import { JournalSheetProvider } from './JournalProvider';
import { JournalSheetLoadingBar, JournalSheetAlerts } from './components';

import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withJournalActions } from './withJournalActions';

import { useJournalQuery } from './utils';
import { compose } from '@/utils';
import { JournalDialogs } from './JournalDialogs';

/**
 * Journal sheet.
 */
function Journal({
  // #withJournalActions
  toggleJournalSheetFilter,
}: any) {
  const { query, setLocationQuery } = useJournalQuery();

  // Handle financial statement filter change.
  const handleFilterSubmit = useCallback(
    (filter: any) => {
      const _filter = {
        ...filter,
        fromDate: moment(filter.fromDate).format('YYYY-MM-DD'),
        toDate: moment(filter.toDate).format('YYYY-MM-DD'),
      };
      setLocationQuery(_filter);
    },
    [setLocationQuery],
  );
  // Hide the journal sheet filter drawer once the page unmount.
  useEffect(
    () => () => {
      toggleJournalSheetFilter(false);
    },
    [toggleJournalSheetFilter],
  );

  return (
    <JournalSheetProvider query={query}>
      <JournalToolbarV2 />

      <DashboardPageContent>
        <FinancialStatement>
          <JournalHeaderV2
            onSubmitFilter={handleFilterSubmit}
            pageFilter={query}
          />
          <JournalSheetLoadingBar />
          <JournalSheetAlerts />
          <JournalBody />
        </FinancialStatement>
      </DashboardPageContent>

      <JournalDialogs />
    </JournalSheetProvider>
  );
}

export default compose(withDashboardActions, withJournalActions)(Journal);
