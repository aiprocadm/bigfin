// @ts-nocheck
import React from 'react';
import { isEmpty } from 'lodash';
import { useResourceViews, useResourceMeta } from '@/hooks/query';
import { DashboardInsider } from '@/components';
import { useProjects } from '../../hooks';
import { useFeatureCan } from '@/hooks/state';
import { Features } from '@/constants/features';

const ProjectsListContext = React.createContext();

/**
 * Projects list data provider.
 * @returns
 */
function ProjectsListProvider({ query, tableStateChanged, ...props }) {
  // Fetch accounts resource views and fields.
  const { data: projectsViews, isLoading: isViewsLoading } =
    useResourceViews('projects');

  // Fetch accounts list according to the given custom view id.
  // Список берётся с ручки сделок, закрытой флагом: без проверки страница
  // покажет ложное «нет прав» (М2 карты v15).
  const { featureCan } = useFeatureCan();
  const isProjectsFeatureCan = featureCan(Features.Projects);
  const {
    data: { projects },
    isFetching: isProjectsFetching,
    isLoading: isProjectsLoading,
  } = useProjects(query, {
    keepPreviousData: true,
    enabled: !!isProjectsFeatureCan,
  });

  // Detarmines the datatable empty status.
  const isEmptyStatus =
    isEmpty(projects) && !tableStateChanged && !isProjectsLoading;

  // provider payload.
  const provider = {
    projects,

    projectsViews,

    isProjectsLoading,
    isProjectsFetching,
    isViewsLoading,

    isEmptyStatus,
  };

  return (
    <DashboardInsider loading={isViewsLoading} name={'projects'}>
      <ProjectsListContext.Provider value={provider} {...props} />
    </DashboardInsider>
  );
}

const useProjectsListContext = () => React.useContext(ProjectsListContext);

export { ProjectsListProvider, useProjectsListContext };
