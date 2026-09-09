import React, { lazy } from 'react';
import type { DrawerReduxProps } from '@/components/DialogReduxConnect';
import { Drawer, DrawerSuspense } from '@/components';
import { withDrawers } from '@/containers/Drawer/withDrawers';

import { compose } from '@/utils';

// У модуля содержимого вывоза «по умолчанию» нет — только именованный.
// Отложенная загрузка требует именно `default`, поэтому при открытии ящика
// React получил бы `undefined` вместо экрана. Сегодня это не проявлялось:
// ящик зарегистрирован в `DrawersContainer`, но открыть его неоткуда — ни
// одного `openDrawer(DRAWERS.CATEGORIZE_TRANSACTION)` в витрине нет
// (Д15 карты v84). Соседний `AccountTransactionsAside` заворачивает имя так же.
const CategorizeTransactionContent = lazy(() =>
  import('./CategorizeTransactionContent').then((module) => ({
    default: module.CategorizeTransactionContent,
  })),
);

/**
 * Categorize the uncategorized transaction drawer.
 */
function CategorizeTransactionDrawer({
  name,
  // #withDrawer
  isOpen,
  payload: { uncategorizedTransactionId } = {
    uncategorizedTransactionId: null,
  },
}: DrawerReduxProps<{ uncategorizedTransactionId: number | null }>) {
  return (
    <Drawer
      isOpen={isOpen}
      name={name}
      style={{ minWidth: '480px', maxWidth: '600px' }}
      size={'40%'}
    >
      <DrawerSuspense>
        <CategorizeTransactionContent
          uncategorizedTransactionId={uncategorizedTransactionId}
        />
      </DrawerSuspense>
    </Drawer>
  );
}

export default compose(withDrawers())(CategorizeTransactionDrawer);
