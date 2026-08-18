// @ts-nocheck
import React from 'react';
import {
  useProjects,
  useProjectTasks,
  useCreateProjectTimeEntry,
  useEditProjectTimeEntry,
  useProjectTimeEntry,
} from '../../hooks';
import { DialogContent } from '@/components';
import { useFeatureCan } from '@/hooks/state';
import { Features } from '@/constants/features';

const ProjecctTimeEntryFormContext = React.createContext();

/**
 * Project time entry form provider.
 * @returns
 */
function ProjectTimeEntryFormProvider({
  // #ownProps
  dialogName,
  projectId,
  timesheetId,
  ...props
}) {
  // project payload.
  const [project, setProjectPayload] = React.useState(projectId);

  // Create and edit project time entry mutations.
  const { mutateAsync: createProjectTimeEntryMutate } =
    useCreateProjectTimeEntry();
  const { mutateAsync: editProjectTimeEntryMutate } = useEditProjectTimeEntry();

  // Handle fetch project tasks.
  const {
    data: { projectTasks },
  } = useProjectTasks(project, {
    enabled: !!project,
  });

  // Handle fetch project time entry detail.
  const { data: projectTimeEntry, isLoading: isProjectTimeEntryLoading } =
    useProjectTimeEntry(timesheetId, {
      enabled: !!timesheetId,
    });

  // Fetch project list data table or list
  // Список берётся с ручки сделок, закрытой флагом: без проверки диалог
  // покажет ложное «нет прав» (М2 карты v15).
  const { featureCan } = useFeatureCan();
  const isProjectsFeatureCan = featureCan(Features.Projects);
  const {
    data: { projects },
    isLoading: isProjectsLoading,
  } = useProjects({}, { enabled: !!isProjectsFeatureCan });

  const isNewMode = !timesheetId;

  // provider payload.
  const provider = {
    dialogName,
    projects,
    projectId,
    timesheetId,
    projectTasks,
    isNewMode,
    setProjectPayload,
    projectTimeEntry,
    createProjectTimeEntryMutate,
    editProjectTimeEntryMutate,
  };

  return (
    <DialogContent
      isLoading={isProjectsLoading || isProjectTimeEntryLoading}
      name={'project-time-entry-form'}
    >
      <ProjecctTimeEntryFormContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useProjectTimeEntryFormContext = () =>
  React.useContext(ProjecctTimeEntryFormContext);

export { ProjectTimeEntryFormProvider, useProjectTimeEntryFormContext };
