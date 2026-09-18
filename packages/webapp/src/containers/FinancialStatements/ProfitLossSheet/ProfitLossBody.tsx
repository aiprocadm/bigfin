import React from 'react';

import ProfitLossSheetTable from './ProfitLossSheetTable';
import { FinancialSheetSkeleton } from '@/components';
import { FinancialReportBody } from '../FinancialReportPage';
import { useProfitLossSheetContext } from './ProfitLossProvider';
import ReportChart from '../ReportChart';

import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';

import { compose } from '@/utils';

/**
 * @returns {React.JSX}
 */
function ProfitLossBodyJSX({
  // #withPreferences
  organizationName,
}: any) {
  const { isLoading, httpQuery } = useProfitLossSheetContext();

  return (
    <FinancialReportBody>
      {isLoading ? (
        <FinancialSheetSkeleton />
      ) : (
        <>
          {/*
            График над таблицей (п. 4.2 ТЗ): столбцы — выручка, линия —
            прибыль. Ряды считает сервер из узлов этого же отчёта, поэтому
            картинка и таблица показывают одни и те же числа.
          */}
          <ReportChart
            kind="profit_loss"
            fromDate={httpQuery?.fromDate}
            toDate={httpQuery?.toDate}
          />
          <ProfitLossSheetTable companyName={organizationName} />
        </>
      )}
    </FinancialReportBody>
  );
}

export const ProfitLossBody = compose(
  withCurrentOrganization(({ organization }: any) => ({
    organizationName: organization.name,
  })),
)(ProfitLossBodyJSX);
