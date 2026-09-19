import React from 'react';

import BalanceSheetTable from './BalanceSheetTable';
import BalanceStructureChart from '../BalanceStructureChart';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';

import { FinancialReportBody } from '../FinancialReportPage';
import { useBalanceSheetContext } from './BalanceSheetProvider';
import { FinancialSheetSkeleton } from '@/components';
import { compose } from '@/utils';

/**
 * Balance sheet body JSX.
 * @returns {React.JSX}
 */
function BalanceSheetBodyJSX({
  // #withCurrentOrganization
  organizationName,
}: any) {
  const { isLoading, httpQuery } = useBalanceSheetContext();

  return (
    <FinancialReportBody>
      {isLoading ? (
        <FinancialSheetSkeleton />
      ) : (
        <>
          {/*
            Картинка над таблицей (остаток О2 ТЗ): из чего состоит имущество
            и за чей счёт оно куплено. Две полосы, а не круг: баланс тем и
            устроен, что обе стороны равны, а круг это равенство прячет.
          */}
          <BalanceStructureChart
            fromDate={httpQuery?.fromDate}
            toDate={httpQuery?.toDate}
          />
          <BalanceSheetTable companyName={organizationName} />
        </>
      )}
    </FinancialReportBody>
  );
}

export const BalanceSheetBody = compose(
  withCurrentOrganization(({ organization }: any) => ({
    organizationName: organization.name,
  })),
)(BalanceSheetBodyJSX);
