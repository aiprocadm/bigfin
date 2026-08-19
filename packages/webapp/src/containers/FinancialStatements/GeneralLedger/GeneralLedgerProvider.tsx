// @ts-nocheck
import React, { createContext, useContext } from 'react';

import FinancialReportPage from '../FinancialReportPage';
import { useGeneralLedgerSheet } from '@/hooks/query';
import { transformFilterFormToQuery } from '../common';
import { showApiError } from '@/utils/showApiError';

const GeneralLedgerContext = createContext();

/**
 * General ledger provider.
 */
function GeneralLedgerProvider({ query, ...props }) {
  // Transformes the report query to request query.
  const httpQuery = React.useMemo(
    () => transformFilterFormToQuery(query),
    [query],
  );
  const {
    data: generalLedger,
    isFetching,
    isLoading,
    refetch,
  } = useGeneralLedgerSheet(httpQuery, {
    keepPreviousData: true,
    // Отчёт может честно отказать («сузьте период»). Без этого причина
    // не доходила до человека вовсе — экран падал в общую заглушку.
    onError: (error: unknown) => showApiError(error),
  });

  const provider = {
    generalLedger,
    sheetRefresh: refetch,
    isFetching,
    isLoading,
    httpQuery,
  };
  return (
    <FinancialReportPage name={'general-ledger-sheet'}>
      <GeneralLedgerContext.Provider value={provider} {...props} />
    </FinancialReportPage>
  );
}

const useGeneralLedgerContext = () => useContext(GeneralLedgerContext);

export { GeneralLedgerProvider, useGeneralLedgerContext };
