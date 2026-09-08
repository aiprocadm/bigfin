import { transformTableStateToQuery } from '@/utils';

export const transformCustomersStateToQuery = (tableState: any) => {
  return {
    ...transformTableStateToQuery(tableState),
    inactive_mode: tableState.inactiveMode,
  };
};
