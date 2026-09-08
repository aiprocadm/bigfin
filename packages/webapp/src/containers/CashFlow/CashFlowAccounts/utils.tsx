import { transformTableStateToQuery } from '@/utils';

/**
 * Transformes the table state to list query.
 */
export const transformAccountsStateToQuery = (tableState: any) => {
  return {
    ...transformTableStateToQuery(tableState),
    inactive_mode: tableState.inactiveMode,
  };
};
