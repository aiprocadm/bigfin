// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React, { useState } from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const ApiKeysGenerateDialogContent = React.lazy(
  () => import('./ApiKeysGenerateDialogContent'),
);

/**
 * API Keys Generate dialog.
 */
function ApiKeysGenerateDialog({ dialogName, payload, isOpen }: DialogReduxProps) {
  return (
    <Dialog
      name={dialogName}
      title={
        <T id={'api_key.dialog.generate_title'} />
      }
      isOpen={isOpen}
      canEscapeKeyClose={true}
      autoFocus={true}
      className={'dialog--api-keys-generate'}
      style={{ width: '500px' }}
    >
      <DialogSuspense>
        <ApiKeysGenerateDialogContent
          dialogName={dialogName}
        />
      </DialogSuspense>
    </Dialog>
  );
}
export default compose(withDialogRedux())(ApiKeysGenerateDialog);
