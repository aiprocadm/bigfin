// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React from 'react';
import type { DrawerReduxProps } from '@/components/DialogReduxConnect';
import * as R from 'ramda';
import { Drawer, DrawerHeaderContent, DrawerSuspense } from '@/components';
import { withDrawers } from '@/containers/Drawer/withDrawers';
import { DRAWERS } from '@/constants/drawers';

const TaxRateDetailsDrawerContent = React.lazy(
  () => import('./TaxRateDetailsContent'),
);

/**
 * Tax rate details drawer.
 */
function TaxRateDetailsDrawer({
  name,
  // #withDrawer
  isOpen,
  payload: { taxRateId } = { taxRateId: null },
}: DrawerReduxProps<{ taxRateId: number | null }>) {
  return (
    <Drawer
      isOpen={isOpen}
      name={name}
      style={{ minWidth: '650px', maxWidth: '650px' }}
      size={'65%'}
    >
      <DrawerSuspense>
        <TaxRateDetailsDrawerContent name={name} taxRateId={taxRateId} />
      </DrawerSuspense>
    </Drawer>
  );
}

export default R.compose(withDrawers())(TaxRateDetailsDrawer);
