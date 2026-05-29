// @ts-nocheck
import { useMutation, useQueryClient } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

const commonInvalidate = (client) => {
  client.invalidateQueries(t.MANAGEMENT_ARTICLES);
  client.invalidateQueries(t.MANAGEMENT_ARTICLE);
  client.invalidateQueries(t.MANAGEMENT_ARTICLES_PL_ROLLUP);
};

/**
 * Retrieve management articles (flat or tree via query.tree = 'true').
 */
export function useManagementArticles(query, props) {
  return useRequestQuery(
    [t.MANAGEMENT_ARTICLES, query],
    { method: 'get', url: 'management-articles', params: query },
    {
      select: (res) => res.data.data,
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Retrieve a single management article.
 */
export function useManagementArticle(id, props) {
  return useRequestQuery(
    [t.MANAGEMENT_ARTICLE, id],
    { method: 'get', url: `management-articles/${id}` },
    {
      select: (res) => res.data,
      defaultData: {},
      ...props,
    },
  );
}

/**
 * Create a management article.
 */
export function useCreateManagementArticle(props) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
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
export function useEditManagementArticle(props) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation(
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
export function useDeleteManagementArticle(props) {
  const client = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((id) => apiRequest.delete(`management-articles/${id}`), {
    onSuccess: () => commonInvalidate(client),
    ...props,
  });
}
