import { getUniversalSearchBind } from '@/containers/UniversalSearch/utils';
import { useResourceData } from '../GenericResource';

/**
 * Transformes the resource data to search entries based on
 * the given resource type.
 * @param {string} type
 * @param {any} resource
 * @returns
 */
function transfromResourceDataToSearch(resource: any) {
  const selectItem = getUniversalSearchBind(resource._type, 'itemSelect');

  return resource.items
    .map((item: any) => ({
      ...selectItem ? selectItem(item) : {}, 
      _type: resource._type,
    }));
}

/**
 *
 * @param {*} type
 * @param {*} searchKeyword
 * @returns
 */
export function useUniversalSearch(type: any, searchKeyword: any, props: any) {
  const { data, ...restProps } = useResourceData(
    type,
    {
      search_keyword: searchKeyword,
    },
    props,
  );
  const searchData = transfromResourceDataToSearch(data);

  return {
    data: searchData,
    ...restProps,
  };
}
