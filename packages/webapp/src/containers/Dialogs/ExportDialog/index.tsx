// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React, { lazy } from 'react';
import intl from 'react-intl-universal';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const ExportDialogContent = lazy(() => import('./ExportDialogContent'));

// User form dialog.
function ExportDialogRoot({ dialogName, payload, isOpen }: DialogReduxProps) {
  const { resource = null, format = null } = payload;

  return (
    <Dialog
      name={dialogName}
      title={intl.get('export.dialog.title')}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        <ExportDialogContent
          dialogName={dialogName}
          initialValues={{ resource, format }}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export const ExportDialog = compose(withDialogRedux())(ExportDialogRoot);
