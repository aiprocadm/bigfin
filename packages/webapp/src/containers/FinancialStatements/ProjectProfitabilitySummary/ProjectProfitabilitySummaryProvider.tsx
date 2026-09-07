import React, { createContext, useMemo, useContext } from 'react';

import FinancialReportPage from '../FinancialReportPage';
import { useProjectProfitabilitySummary } from './hooks';
import { useProjects } from '@/containers/Projects/hooks';
import { useFeatureCan } from '@/hooks/state';
import { Features } from '@/constants/features';
import { transformFilterFormToQuery } from '../common';

const ProjectProfitabilitySummaryContext = createContext<any>(undefined);

function ProjectProfitabilitySummaryProvider({ filter, ...props }: any) {
  // Transformes the given filter to query.
  const query = useMemo(() => transformFilterFormToQuery(filter), [filter]);

  // Handle fetching the items table based on the given query.
  const {
    data: projectProfitabilitySummary,
    isFetching: isProjectProfitabilitySummaryFetching,
    isLoading: isProjectProfitabilitySummaryLoading,
    refetch: refetchProjectProfitabilitySummary,
  } = useProjectProfitabilitySummary(query, { keepPreviousData: true });

  // Fetch project list.
  // «Проекты» — прежнее имя сделок, и список берётся с той же закрытой флагом
  // ручки: без проверки отчёт покажет ложное «нет прав» (М2 карты v15).
  const { featureCan } = useFeatureCan();
  const isProjectsFeatureCan = featureCan(Features.Projects);
  const {
    data: { projects },
    isLoading: isProjectsLoading,
  } = useProjects({}, { enabled: !!isProjectsFeatureCan });

  const provider = {
    projectProfitabilitySummary,
    isProjectProfitabilitySummaryFetching,
    isProjectProfitabilitySummaryLoading,
    refetchProjectProfitabilitySummary,
    projects,
    
    query,
    filter,
  };
  return (
    <FinancialReportPage name={'project-profitability-summary'}>
      <ProjectProfitabilitySummaryContext.Provider
        value={provider}
        {...props}
      />
    </FinancialReportPage>
  );
}

const useProjectProfitabilitySummaryContext = () =>
  useContext(ProjectProfitabilitySummaryContext);

export {
  ProjectProfitabilitySummaryProvider,
  useProjectProfitabilitySummaryContext,
};
