import React, { createContext, useContext } from 'react';
import FinancialReportPage from '../FinancialReportPage';
import { useJournalSheet } from '@/hooks/query';
import { transformFilterFormToQuery } from '../common';
import { showApiError } from '@/utils/showApiError';

const JournalSheetContext = createContext<any>(undefined);

/**
 * Journal sheet provider.
 */
function JournalSheetProvider({ query, ...props }: any) {
  // Transforms the sheet query to request query.
  const httpQuery = React.useMemo(
    () => transformFilterFormToQuery(query),
    [query],
  );
  const {
    data: journalSheet,
    isFetching,
    isLoading,
    refetch,
  } = useJournalSheet(httpQuery, {
    keepPreviousData: true,
    // Отчёт может честно отказать («сузьте период»). Без этого причина
    // не доходила до человека вовсе — экран падал в общую заглушку.
    onError: (error: unknown) => showApiError(error),
  });

  const provider = {
    journalSheet,
    isLoading,
    isFetching,
    refetchSheet: refetch,
    httpQuery,
  };

  return (
    <FinancialReportPage name={'journal-sheet'}>
      <JournalSheetContext.Provider value={provider} {...props} />
    </FinancialReportPage>
  );
}

const useJournalSheetContext = () => useContext(JournalSheetContext);

export { JournalSheetProvider, useJournalSheetContext };
