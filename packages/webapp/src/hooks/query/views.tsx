import { useRequestQuery } from '../useQueryRequest';

/**
 * Retrieve the resource views.
 * @param {string} resourceSlug - Resource slug.
 */
export function useResourceViews(resourceSlug: string) {
  return useRequestQuery(
    ['RESOURCE_VIEW', resourceSlug],
    { method: 'get', url: `views/resource/${resourceSlug}` },
    {
      select: (response: any) => response.data,
      defaultData: [],
    },
  );
}

/**
 * Retrieve the resource meta.
 * @param {string} resourceSlug - Resource slug.
 *
 * Настройки запроса `props` раньше уходили ЧЕТВЁРТЫМ доводом, которого у
 * `useRequestQuery` нет, — то есть в никуда. Сегодня ни одно из шести мест
 * вызова их не передаёт, поэтому поведение не менялось; теперь они попадают
 * в настройки запроса, как везде (Д2 карты v87).
 */
export function useResourceMeta(resourceSlug: string, props?: any) {
  return useRequestQuery(
    ['RESOURCE_META', resourceSlug],
    { method: 'get', url: `resources/${resourceSlug}/meta` },
    {
      select: (res: any) => res.data.resource_meta,
      defaultData: {
        fields: {},
      },
      ...props,
    },
  );
}
