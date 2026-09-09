import React from 'react';
import { compose } from '@/utils';
import styled from 'styled-components';

import { Card, DrawerLoading } from '@/components';

import ItemFormFormik from '../../Items/ItemFormFormik';
import {
  ItemFormProvider,
  useItemFormContext,
} from '../../Items/ItemFormProvider';

import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';

import { useDrawerContext } from '@/components/Drawer/DrawerProvider';
import { DRAWERS } from '@/constants/drawers';

/**
 * Quick create/edit item drawer form.
 */
function QuickCreateItemDrawerForm({
  itemId,
  itemName,
  closeDrawer,

  // #withDashboardActions
  addQuickActionEvent,
}: any) {
  // Drawer context.
  const { payload } = useDrawerContext();

  // Handle the form submit request success.
  const handleSubmitSuccess = (values: any, form: any, submitPayload: any, response: any) => {
    if (submitPayload.redirect) {
      closeDrawer(DRAWERS.QUICK_CREATE_ITEM);
    }
    if (payload.quickActionEvent) {
      addQuickActionEvent(payload.quickActionEvent, {
        itemId: response.data.id,
      });
    }
  };
  // Handle the form cancel.
  const handleFormCancel = () => {
    closeDrawer(DRAWERS.QUICK_CREATE_ITEM);
  };

  return (
    <ItemFormProvider itemId={itemId}>
      <DrawerItemFormLoading>
        <ItemFormCard>
          <ItemFormFormik
            initialValues={{ name: itemName }}
            onSubmitSuccess={handleSubmitSuccess}
            onCancel={handleFormCancel}
          />
        </ItemFormCard>
      </DrawerItemFormLoading>
    </ItemFormProvider>
  );
}

/**
 * Drawer item form loading.
 * @returns {JSX}
 */
function DrawerItemFormLoading({ children }: any) {
  const { isFormLoading } = useItemFormContext();

  return <DrawerLoading loading={isFormLoading}>{children}</DrawerLoading>;
}

// Сборка своя, а не `R.compose`: у ramda объявление не умеет вычесть свойства,
// которые подставляет надстройка, — получается «ничего» (`never`), и место
// вызова не может передать ни одного свойства. Порядок применения у обеих
// сборок одинаковый: `compose(f, g)(X)` — это `f(g(X))` (Д22 карты v82).
export default compose(
  withDrawerActions,
  withDashboardActions,
)(QuickCreateItemDrawerForm);

const ItemFormCard = styled(Card)`
  margin: 15px;
  padding: 25px;
  margin-bottom: calc(15px + 65px);

  .page-form {
    padding: 0;

    &__floating-actions {
      margin-left: -41px;
      margin-right: -41px;
    }
  }
`;
