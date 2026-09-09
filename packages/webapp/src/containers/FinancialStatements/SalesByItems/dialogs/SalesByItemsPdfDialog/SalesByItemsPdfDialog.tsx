import React, { lazy } from 'react';
import classNames from 'classnames';

import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

// Lazy loading the content.
const SalesByItemsPdfDialogContent = lazy(
  () => import('./SalesByItemsPdfDialogContent'),
);

/**
 * Sales by items sheet pdf preview dialog.
 * @returns {React.ReactNode}
 */
function SalesByItemsPdfDialogRoot({ dialogName, payload, isOpen }: DialogReduxProps) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'sales_by_items_preview.dialog.title'} />}
      className={classNames(CLASSES.DIALOG_PDF_PREVIEW)}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      style={{ width: '1000px' }}
    >
      <DialogSuspense>
        {/* Содержимое окна не принимает свойств вовсе: `dialogName` сюда
            передавали, но никто его не читал (Д2 карты v83). */}
        <SalesByItemsPdfDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const SalesByItemsPdfDialog = compose(withDialogRedux())(
  SalesByItemsPdfDialogRoot,
);
