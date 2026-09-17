import { useQueryClient, useMutation } from 'react-query';
import { useRequestQuery } from '@/hooks/useQueryRequest';
import useApiRequest from '@/hooks/useRequest';
import t from './type';

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: any) => {
  // Invalidate projects.
  queryClient.invalidateQueries(t.PROJECTS);
  // Invalidate project tasks.
  queryClient.invalidateQueries(t.PROJECT_TASKS);
};

/**
 * Create a new project task.
 *  @param props
 */
export function useCreateProjectTask(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.post(`/projects/${id}/tasks`, values),
    {
      onSuccess: (res, [id, values]) => {
        // Common invalidate queries.
        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Edit the given project task.
 * @param props
 * @returns
 */
export function useEditProjectTask(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(([id, values]: [any, any]) => apiRequest.put(`tasks/${id}`, values), {
    onSuccess: (res, [id, values]) => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);

      // Invalidate specific project task.
      queryClient.invalidateQueries([t.PROJECT_TASK, id]);
    },
    ...props,
  });
}

/**
 * Delete the given project task.
 * @param props
 */
export function useDeleteProjectTask(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`tasks/${id}`), {
    onSuccess: (res, id) => {
      // Invalidate specific project task.
      queryClient.invalidateQueries([t.PROJECT_TASK, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Retrive the given project task.
 * @param taskId
 * @param props
 * @param requestProps
 * @returns
 */
export function useProjectTask(taskId: any, props?: any, requestProps?: any) {
  return useRequestQuery(
    [t.PROJECT_TASK, taskId],
    { method: 'get', url: `tasks/${taskId}`, ...requestProps },
    {
      select: (res: any) => res.data.task,
      defaultData: {},
      ...props,
    },
  );
}

const transformProjectTasks = (res: any) => ({
  projectTasks: res.data.tasks,
});

/**
 *
 * @param projectId - Project id.
 * @param query
 * @param requestProps
 * @returns
 */
export function useProjectTasks(projectId: any, props?: any, requestProps?: any) {
  return useRequestQuery(
    [t.PROJECT_TASKS, projectId],
    { method: 'get', url: `projects/${projectId}/tasks`, ...requestProps },
    {
      select: transformProjectTasks,
      defaultData: {
        projectTasks: [],
      },
      ...props,
    },
  );
}
