import { useCallback, useEffect } from 'react';
import moment from 'moment';

// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси ARAgingSummaryHeader/ARAgingSummaryActionsBar остаются на месте (не удаляем).
import { ARAgingSummaryHeaderV2 } from './v2/ARAgingSummaryHeaderV2';
import { ARAgingSummaryToolbarV2 } from './v2/ARAgingSummaryToolbarV2';

import { FinancialStatement, DashboardPageContent } from '@/components';
import { ARAgingSummaryProvider } from './ARAgingSummaryProvider';
import { ARAgingSummarySheetLoadingBar } from './components';
import { ARAgingSummaryBody } from './ARAgingSummaryBody';

import { withARAgingSummaryActions } from './withARAgingSummaryActions';

import { useARAgingSummaryQuery } from './common';
import { ARAgingSummaryPdfDialog } from './dialogs/ARAgingSummaryPdfDialog';
import { DialogsName } from '@/constants/dialogs';
import { compose } from '@/utils';

/**
 * A/R aging summary report.
 */
function ReceivableAgingSummarySheet({
  // #withARAgingSummaryActions
  toggleARAgingSummaryFilterDrawer: toggleDisplayFilterDrawer,
}: any) {
  const { query, setLocationQuery } = useARAgingSummaryQuery();

  // Handle filter submit.
  const handleFilterSubmit = useCallback(
    (filter: any) => {
      const _filter = {
        ...filter,
        asDate: moment(filter.asDate).format('YYYY-MM-DD'),
      };
      setLocationQuery(_filter);
    },
    [setLocationQuery],
  );

  // Handle number format submit.
  const handleNumberFormatSubmit = (numberFormat: any) => {
    setLocationQuery({ ...query, numberFormat });
  };
  // Hide the filter drawer once the page unmount.
  useEffect(
    () => () => toggleDisplayFilterDrawer(false),
    [toggleDisplayFilterDrawer],
  );

  return (
    <ARAgingSummaryProvider filter={query}>
      <ARAgingSummaryToolbarV2
        numberFormat={query.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <ARAgingSummarySheetLoadingBar />

      <DashboardPageContent>
        <FinancialStatement>
          <ARAgingSummaryHeaderV2
            pageFilter={query}
            onSubmitFilter={handleFilterSubmit}
          />
          <ARAgingSummaryBody />
        </FinancialStatement>
      </DashboardPageContent>

      <ARAgingSummaryPdfDialog
        dialogName={DialogsName.ARAgingSummaryPdfPreview}
      />
    </ARAgingSummaryProvider>
  );
}

export default compose(withARAgingSummaryActions)(ReceivableAgingSummarySheet);
