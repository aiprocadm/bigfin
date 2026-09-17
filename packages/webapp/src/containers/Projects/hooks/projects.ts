import { useQueryClient, useMutation } from 'react-query';
import { useRequestQuery } from '@/hooks/useQueryRequest';
import { transformPagination } from '@/utils';
import useApiRequest from '@/hooks/useRequest';
import t from './type';

// Common invalidate queries.
const commonInvalidateQueries = (queryClient: any) => {
  // Invalidate projects.
  queryClient.invalidateQueries(t.PROJECT);
  queryClient.invalidateQueries(t.PROJECTS);
};

/**
 * Create a new project
 * @param props
 */
export function useCreateProject(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((values: any) => apiRequest.post('projects', values), {
    onSuccess: (res, values) => {
      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Edit the given project
 * @param props
 * @returns
 */
export function useEditProject(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.put(`/projects/${id}`, values),
    {
      onSuccess: (res, [id, values]) => {
        // Invalidate specific project.
        queryClient.invalidateQueries([t.PROJECT, id]);

        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

/**
 * Delete the given project
 * @param props
 */
export function useDeleteProject(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id: number) => apiRequest.delete(`projects/${id}`), {
    onSuccess: (res, id) => {
      // Invalidate specific project.
      queryClient.invalidateQueries([t.PROJECT, id]);

      // Common invalidate queries.
      commonInvalidateQueries(queryClient);
    },
    ...props,
  });
}

/**
 * Retrieve the projects details.
 * @param projectId The project id
 * @param props
 * @param requestProps
 * @returns
 */
// Оба последних довода необязательны: ни одно из девяти мест вызова третий не
// передаёт вовсе, а прежняя запись требовала его от всех (Д4 карты v76).
export function useProject(projectId: any, props?: any, requestProps?: any) {
  return useRequestQuery(
    [t.PROJECT, projectId],
    { method: 'get', url: `projects/${projectId}`, ...requestProps },
    {
      select: (res: any) => res.data.project,
      defaultData: {},
      ...props,
    },
  );
}

const transformProjects = (res: any) => ({
  projects: res.data.data,
});

/**
 * Retrieve projects list with pagination meta.
 * @param query
 * @param props
 */
export function useProjects(query: any, props?: any) {
  return useRequestQuery(
    [t.PROJECTS, query],
    { method: 'get', url: 'deals', params: query },
    {
      select: transformProjects,
      defaultData: {
        projects: [],
      },
      ...props,
    },
  );
}

/**
 *
 * @param props
 * @returns
 */
export function useProjectStatus(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
    ([id, values]: [any, any]) => apiRequest.patch(`projects/${id}/status`, values),
    {
      onSuccess: (res, [id, values]) => {
        // Invalidate specific project.
        queryClient.invalidateQueries([t.PROJECT, id]);

        commonInvalidateQueries(queryClient);
      },
      ...props,
    },
  );
}

export function useRefreshProjects() {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries(t.PROJECTS);
    },
  };
}
