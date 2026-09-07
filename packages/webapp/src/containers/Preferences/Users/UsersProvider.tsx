// @ts-nocheck
import React, { createContext } from 'react';
import { useUsers } from '@/hooks/query';

const UsersListContext = createContext<any>(undefined);

/**
 * Users list provider.
 */
function UsersListProvider(props) {
  const { data: users, isLoading, isFetching } = useUsers();
  
  const state = {
    isUsersLoading: isLoading,
    isUsersFetching: isFetching,
    users,
  };

  return (
    <UsersListContext.Provider value={state} {...props} />
  );
}

const useUsersListContext = () => React.useContext(UsersListContext);

export { UsersListProvider, useUsersListContext };
