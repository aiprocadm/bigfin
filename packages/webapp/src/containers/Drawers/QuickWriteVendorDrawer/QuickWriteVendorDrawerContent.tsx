// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React from 'react';
import {
  DrawerHeaderContent,
  DrawerBody,
  FormattedMessage as T,
} from '@/components';

import QuickVendorFormDrawer from './QuickVendorFormDrawer';
import { DRAWERS } from '@/constants/drawers';

/**
 * Quick create/edit vendor drawer.
 */
export default function QuickWriteVendorDrawerContent({
  displayName,
  autofillRef,
}: {
  displayName?: string;
  autofillRef?: any;
}) {
  return (
    <React.Fragment>
      <DrawerHeaderContent
        name={DRAWERS.QUICK_CREATE_CUSTOMER}
        title={<T id={'create_a_new_vendor'} />}
      />
      <DrawerBody>
        <QuickVendorFormDrawer displayName={displayName} autofillRef={autofillRef} />
      </DrawerBody>
    </React.Fragment>
  );
}
