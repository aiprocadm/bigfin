// @ts-nocheck
import React, { useCallback, useEffect } from 'react';
import moment from 'moment';

import { useAPAgingSummaryQuery } from './common';
import { FinancialStatement, DashboardPageContent } from '@/components';

// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси APAgingSummaryHeader/APAgingSummaryActionsBar остаются на месте (не удаляем).
import { APAgingSummaryHeaderV2 } from './v2/APAgingSummaryHeaderV2';
import { APAgingSummaryToolbarV2 } from './v2/APAgingSummaryToolbarV2';

import { APAgingSummaryBody } from './APAgingSummaryBody';
import { APAgingSummaryProvider } from './APAgingSummaryProvider';
import { APAgingSummarySheetLoadingBar } from './components';

import { withAPAgingSummaryActions } from './withAPAgingSummaryActions';

import { compose } from '@/utils';
import { APAgingSummaryPdfDialog } from './dialogs/APAgingSummaryPdfDialog';
import { DialogsName } from '@/constants/dialogs';

/**
 * A/P aging summary report.
 */
function APAgingSummary({
  // #withSettings
  organizationName,

  // #withAPAgingSummaryActions
  toggleAPAgingSummaryFilterDrawer: toggleDisplayFilterDrawer,
}) {
  const { query, setLocationQuery } = useAPAgingSummaryQuery();

  // Handle filter submit.
  const handleFilterSubmit = useCallback(
    (filter) => {
      const _filter = {
        ...filter,
        asDate: moment(filter.asDate).format('YYYY-MM-DD'),
      };
      setLocationQuery(_filter);
    },
    [setLocationQuery],
  );
  // Handle number format submit.
  const handleNumberFormatSubmit = (numberFormat) => {
    setLocationQuery({ ...filter, numberFormat });
  };
  // Hide the report filter drawer once the page unmount.
  useEffect(
    () => () => {
      toggleDisplayFilterDrawer(false);
    },
    [toggleDisplayFilterDrawer],
  );

  return (
    <APAgingSummaryProvider filter={query}>
      <APAgingSummaryToolbarV2
        numberFormat={query.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <APAgingSummarySheetLoadingBar />

      <DashboardPageContent>
        <FinancialStatement name={'AP-aging-summary'}>
          <APAgingSummaryHeaderV2
            pageFilter={query}
            onSubmitFilter={handleFilterSubmit}
          />
          <APAgingSummaryBody organizationName={organizationName} />
        </FinancialStatement>
      </DashboardPageContent>

      <APAgingSummaryPdfDialog
        dialogName={DialogsName.APAgingSummaryPdfPreview}
      />
    </APAgingSummaryProvider>
  );
}

export default compose(withAPAgingSummaryActions)(APAgingSummary);
