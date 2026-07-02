// @ts-nocheck
import React from 'react';

import '@/style/pages/ManualJournal/List.scss';

import { DashboardPageContent } from '@/components';
import { transformTableStateToQuery, compose } from '@/utils';

import { ManualJournalsListProvider } from './ManualJournalsListProvider';
import { ManualJournalsTableV2 } from './v2/ManualJournalsTableV2';
import { ManualJournalsToolbarV2 } from './v2/ManualJournalsToolbarV2';
import { withManualJournals } from './withManualJournals';


/**
 * Manual journals table.
 */
function ManualJournalsTable({
  // #withManualJournals
  journalsTableState,
  journalsTableStateChanged,
}) {
  return (
    <ManualJournalsListProvider
      query={transformTableStateToQuery(journalsTableState)}
      tableStateChanged={journalsTableStateChanged}
    >
      <ManualJournalsToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <ManualJournalsTableV2 />
        </div>
      </DashboardPageContent>
    </ManualJournalsListProvider>
  );
}

export default compose(
  withManualJournals(
    ({ manualJournalsTableState, manualJournalTableStateChanged }) => ({
      journalsTableState: manualJournalsTableState,
      journalsTableStateChanged: manualJournalTableStateChanged,
    }),
  ),
)(ManualJournalsTable);
