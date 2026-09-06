import React, { useCallback, useEffect } from 'react';
import moment from 'moment';

// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси GeneralLedgerHeader/GeneralLedgerActionsBar остаются на месте (не удаляем).
import { GeneralLedgerHeaderV2 } from './v2/GeneralLedgerHeaderV2';
import { GeneralLedgerToolbarV2 } from './v2/GeneralLedgerToolbarV2';
import { GeneralLedgerBody } from './GeneralLedgerBody';
import { useGeneralLedgerQuery } from './common';
import { GeneralLedgerProvider } from './GeneralLedgerProvider';
import { FinancialStatement, DashboardPageContent } from '@/components';

import {
  GeneralLedgerSheetAlerts,
  GeneralLedgerSheetLoadingBar,
} from './components';

import { withGeneralLedgerActions } from './withGeneralLedgerActions';
import { compose } from '@/utils';
import { GeneralLedgerPdfDialog } from './dialogs/GeneralLedgerPdfDialog';
import { DialogsName } from '@/constants/dialogs';

/**
 * General Ledger (GL) sheet.
 */
function GeneralLedger({
  // #withGeneralLedgerActions
  toggleGeneralLedgerFilterDrawer,
}: any) {
  // General ledger query.
  const { query, setLocationQuery } = useGeneralLedgerQuery();

  // Handle financial statement filter change.
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

  // Hide the filter drawer once the page unmount.
  useEffect(
    () => () => toggleGeneralLedgerFilterDrawer(false),
    [toggleGeneralLedgerFilterDrawer],
  );

  return (
    <GeneralLedgerProvider query={query}>
      <GeneralLedgerToolbarV2 />

      <DashboardPageContent>
        <FinancialStatement>
          <GeneralLedgerHeaderV2
            pageFilter={query}
            onSubmitFilter={handleFilterSubmit}
          />
          <GeneralLedgerSheetLoadingBar />
          <GeneralLedgerSheetAlerts />
          <GeneralLedgerBody />
        </FinancialStatement>
      </DashboardPageContent>

      <GeneralLedgerPdfDialog
        dialogName={DialogsName.GeneralLedgerPdfPreview}
      />
    </GeneralLedgerProvider>
  );
}

export default compose(withGeneralLedgerActions)(GeneralLedger);
