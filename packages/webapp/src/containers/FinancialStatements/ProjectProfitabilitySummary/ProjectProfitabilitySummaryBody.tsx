import React from 'react';

import ProjectProfitabilitySummaryTable from './ProjectProfitabilitySummaryTable';
import { FinancialReportBody } from '../FinancialReportPage';
import { FinancialSheetSkeleton } from '@/components/FinancialSheet';
import { useProjectProfitabilitySummaryContext } from './ProjectProfitabilitySummaryProvider';

import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';

import { compose } from '@/utils';

/**
 * Project profitability summary body JSX.
 * @returns {JSX.Element}
 */
function ProjectProfitabilitySummaryBodyJSX({
  // #withCurrentOrganization
  organizationName,
}: any) {
  const { isProjectProfitabilitySummaryLoading } =
    useProjectProfitabilitySummaryContext();

  return (
    <FinancialReportBody>
      {isProjectProfitabilitySummaryLoading ? (
        <FinancialSheetSkeleton />
      ) : (
        <ProjectProfitabilitySummaryTable companyName={organizationName} />
      )}
    </FinancialReportBody>
  );
}

export const ProjectProfitabilitySummaryBody = compose(
  withCurrentOrganization(({ organization }: any) => ({
    organizationName: organization?.name,
  })),
)(ProjectProfitabilitySummaryBodyJSX);
