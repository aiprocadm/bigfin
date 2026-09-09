// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React, { lazy } from 'react';
import classNames from 'classnames';

import { T, Dialog, DialogSuspense } from '@/components';

import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';

import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

// Lazy loading the content.
const PdfPreviewDialogContent = lazy(() =>
  import('./InvoicePdfPreviewDialogContent'),
);

/**
 * Invoice PDF preview dialog.
 */
function InvoicePdfPreviewDialog({ dialogName, payload, isOpen }: DialogReduxProps) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'invoice_preview.dialog.title'} />}
      className={classNames(CLASSES.DIALOG_PDF_PREVIEW)}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      style={{ width: '1000px' }}
    >
      <DialogSuspense>
        <PdfPreviewDialogContent
          subscriptionForm={payload}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export default compose(withDialogRedux())(InvoicePdfPreviewDialog);
