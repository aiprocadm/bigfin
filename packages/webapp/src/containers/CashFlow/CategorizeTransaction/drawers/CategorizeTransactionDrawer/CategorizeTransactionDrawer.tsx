// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React, { lazy } from 'react';
import type { DrawerReduxProps } from '@/components/DialogReduxConnect';
import { Drawer, DrawerSuspense } from '@/components';
import { withDrawers } from '@/containers/Drawer/withDrawers';

import { compose } from '@/utils';

const CategorizeTransactionContent = lazy(
  () => import('./CategorizeTransactionContent'),
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
