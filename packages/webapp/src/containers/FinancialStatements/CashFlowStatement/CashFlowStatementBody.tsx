import React from 'react';
import * as R from 'ramda';

import CashFlowStatementTable from './CashFlowStatementTable';
import { FinancialReportBody } from '../FinancialReportPage';
import { FinancialSheetSkeleton } from '@/components/FinancialSheet';

import { useCashFlowStatementContext } from './CashFlowStatementProvider';
import ReportChart from '../ReportChart';
import PlanFactSummary from '../PlanFactSummary';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';

/**
 * Cashflow stement body.
 * @returns {React.JSX}
 */
function CashFlowStatementBodyJSX({
  // #withPreferences
  organizationName,
}: any) {
  const { isCashFlowLoading, httpQuery } = useCashFlowStatementContext();

  return (
    <FinancialReportBody>
      {isCashFlowLoading ? (
        <FinancialSheetSkeleton />
      ) : (
        <>
          {/*
            График над таблицей (п. 4.2 ТЗ): поступления и выплаты по месяцам.
            Считаются по денежным счетам — тому же источнику, что и остатки
            в разделе «Банк».
          */}
          <ReportChart
            kind="cash_flow"
            fromDate={httpQuery?.fromDate}
            toDate={httpQuery?.toDate}
          />
          {/*
            План и факт по бюджету движения денег (п. 4.4 ТЗ) — сводкой,
            а не колонками: строки этого отчёта — балансовые счета,
            а бюджет разложен по статьям доходов и расходов.
          */}
          <PlanFactSummary
            report="cash_flow"
            fromDate={httpQuery?.fromDate}
            toDate={httpQuery?.toDate}
          />
          <CashFlowStatementTable companyName={organizationName} />
        </>
      )}
    </FinancialReportBody>
  );
}

export const CashFlowStatementBody = R.compose(
  withCurrentOrganization(({ organization }: any) => ({
    organizationName: organization.name,
  })),
)(CashFlowStatementBodyJSX);
