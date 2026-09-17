import React from 'react';
import {
  useCreateProjectTask,
  useEditProjectTask,
  useProjectTask,
} from '../../hooks';
import { DialogContent } from '@/components';

const ProjectTaskFormContext = React.createContext<any>(undefined);

interface ProjectTaskFormProviderProps {
  // #ownProps
  dialogName: string;
  taskId?: number;
  projectId?: number;
  children?: React.ReactNode;
}

/**
 * Project task form provider.
 * @returns
 */
function ProjectTaskFormProvider({
  // #ownProps
  dialogName,
  taskId,
  projectId,
  ...props
}: ProjectTaskFormProviderProps) {
  // Create and edit project task mutations.
  const { mutateAsync: createProjectTaskMutate } = useCreateProjectTask();
  const { mutateAsync: editProjectTaskMutate } = useEditProjectTask();

  // Handle fetch project task detail.
  const { data: projectTask, isLoading: isProjectTaskLoading } = useProjectTask(
    taskId,
    {
      enabled: !!taskId,
    },
  );

  const isNewMode = !taskId;
  // State provider.
  const provider = {
    dialogName,
    isNewMode,
    taskId,
    projectId,
    projectTask,
    createProjectTaskMutate,
    editProjectTaskMutate,
  };

  return (
    <DialogContent isLoading={isProjectTaskLoading}>
      <ProjectTaskFormContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useProjectTaskFormContext = () =>
  React.useContext(ProjectTaskFormContext);

export { ProjectTaskFormProvider, useProjectTaskFormContext };
