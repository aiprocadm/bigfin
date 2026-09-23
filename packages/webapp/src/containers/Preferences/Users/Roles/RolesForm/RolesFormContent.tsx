import React from 'react';
import { Form } from 'formik';

import { RoleFormHeader } from './RoleFormHeader';
import { RolesPermissionList } from './components';
import { RoleFormFloatingActions } from './RoleFormFloatingActions';
import { RoleFormObserver } from './RoleFormObserver';
import { RoleLegalEntitiesField } from './RoleLegalEntitiesField';
import { RoleRowScopeField } from './RoleRowScopeField';

/**
 * Preferences - Roles Form content.
 * @returns {React.JSX}
 */
export default function RolesFormContent() {
  return (
    <Form>
      <RoleFormHeader />
      <RolesPermissionList />
      {/* Юрлица роли (§8.4, остаток К6). Поля нет вовсе, пока юрлицо
          одно: сужать доступ не к чему. */}
      <RoleLegalEntitiesField />
      {/* Статьи, направления, счета роли (FT-080 ТЗ-3). */}
      <RoleRowScopeField />
      <RoleFormFloatingActions />
      <RoleFormObserver />
    </Form>
  );
}
