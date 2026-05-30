import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

export interface ManagementArticleValues {
  name: string;
  kind: 'income' | 'expense';
  parentId?: number | null;
  cashflowSection?: 'operating' | 'investing' | 'financing';
  accountIds?: number[];
}

export type EditManagementArticleArgs = [
  number | string,
  ManagementArticleValues,
];

const commonInvalidate = (client: QueryClient) => {
  client.invalidateQueries(t.MANAGEMENT_ARTICLES);
  client.invalidateQueries(t.MANAGEMENT_ARTICLE);
  client.invalidateQueries(t.MANAGEMENT_ARTICLES_PL_ROLLUP);
};

/**
 * Retrieve management articles (flat, or tree via query.tree = 'true').
 */
export function useManagementArticles(query?: any, props?: any) {
  return useRequestQuery(
    [t.MANAGEMENT_ARTICLES, query],
    { method: 'get', url: 'management-articles', params: query },
    {
      select: (res: any) => res.data.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Retrieve a single management article.
 */
export function useManagementArticle(id: number | string, props?: any) {
  return useRequestQuery(
    [t.MANAGEMENT_ARTICLE, id],
    { method: 'get', url: `management-articles/${id}` },
    {
      select: (res: any) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

/**
 * Create a management article.
 */
export function useCreateManagementArticle(
  props?: UseMutationOptions<any, any, ManagementArticleValues>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation<any, any, ManagementArticleValues>(
    (values) => apiRequest.post('management-articles', values),
    {
      onSuccess: () => commonInvalidate(client),
      ...props,
    },
  );
}

/**
 * Edit the given management article.
 */
export function useEditManagementArticle(
  props?: UseMutationOptions<any, any, EditManagementArticleArgs>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation<any, any, EditManagementArticleArgs>(
    ([id, values]) => apiRequest.put(`management-articles/${id}`, values),
    {
      onSuccess: () => commonInvalidate(client),
      ...props,
    },
  );
}

/**
 * Delete the given management article.
 */
export function useDeleteManagementArticle(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();

  return useMutation<any, any, number | string>(
    (id) => apiRequest.delete(`management-articles/${id}`),
    {
      onSuccess: () => commonInvalidate(client),
      ...props,
    },
  );
}
