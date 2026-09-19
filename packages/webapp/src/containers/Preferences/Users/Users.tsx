import React from 'react';
import intl from 'react-intl-universal';
import classNames from 'classnames';
import styled from 'styled-components';

import '@/style/pages/Preferences/Users.scss';

import { Card } from '@/components';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CLASSES } from '@/constants/classes';
import PreferencesSubContent from '@/components/Preferences/PreferencesSubContent';

import { withUserPreferences } from '@/containers/Preferences/Users/withUserPreferences';

/**
 * Настройки — пользователи и роли.
 *
 * Вкладки переведены на новые (остаток Д1). Разница не только в облике:
 * старые вкладки всплывали над полосой, новые — подчёркиваются. Так же
 * выглядят вкладки на всех прочих экранах, и продукт не двоится.
 */
function UsersPreferences({ openDialog }: any) {
  return (
    <div
      className={classNames(
        CLASSES.PREFERENCES_PAGE_INSIDE_CONTENT,
        CLASSES.PREFERENCES_PAGE_INSIDE_CONTENT_USERS,
      )}
    >
      <UsersPereferencesCard>
        <div className={classNames(CLASSES.PREFERENCES_PAGE_TABS)}>
          <Tabs defaultValue="users">
            <TabsList className="px-3">
              <TabsTrigger value="users">{intl.get('users')}</TabsTrigger>
              <TabsTrigger value="roles">{intl.get('roles')}</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <PreferencesSubContent preferenceTab="users" />
            </TabsContent>
            <TabsContent value="roles">
              <PreferencesSubContent preferenceTab="roles" />
            </TabsContent>
          </Tabs>
        </div>
      </UsersPereferencesCard>
    </div>
  );
}

export default withUserPreferences(UsersPreferences);

const UsersPereferencesCard = styled(Card)`
  padding: 0;
`;
