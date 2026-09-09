import type React from 'react';
// import AccountsCustomFields from "containers/Preferences/AccountsCustomFields";
import UsersList from '../containers/Preferences/Users/UsersList';
import RolesList from '../containers/Preferences/Users/Roles/RolesLanding/RolesList';

/**
 * Запись вкладки настроек. Объявлена по той же причине, что и `DashboardRoute`
 * в карте v83: без неё список — объединение видов по записи на каждую, и
 * чтение необязательного ключа считается обращением к несуществующему
 * свойству (Д8 карты v84).
 */
export interface PreferencesTabRoute {
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
}

const preferencesTabs: Record<string, PreferencesTabRoute[]> = {
  users: [
    {
      path: '',
      component: UsersList,
      exact: true,
    },
  ],
  roles: [
    {
      path: '',
      component: RolesList,
      exact: true,
    },
  ],
};

export default preferencesTabs;
