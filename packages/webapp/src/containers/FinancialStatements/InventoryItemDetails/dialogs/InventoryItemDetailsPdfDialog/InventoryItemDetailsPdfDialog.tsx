import React, { lazy } from 'react';
import classNames from 'classnames';

import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

// Lazy loading the content.
const InventoryItemDetailsPdfDialogContent = lazy(
  () => import('./InventoryItemDetailsPdfDialogContent'),
);

/**
 * Inventory item details sheet pdf preview dialog.
 * @returns {React.ReactNode}
 */
function InventoryItemDetailsPdfDialogRoot({ dialogName, payload, isOpen }: DialogReduxProps) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'inventory_item_details_preview.dialog.title'} />}
      className={classNames(CLASSES.DIALOG_PDF_PREVIEW)}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      style={{ width: '1000px' }}
    >
      <DialogSuspense>
        {/* Содержимое окна не принимает свойств вовсе: `dialogName` сюда
            передавали, но никто его не читал (Д2 карты v83). */}
        <InventoryItemDetailsPdfDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const InventoryItemDetailsPdfDialog = compose(withDialogRedux())(
  InventoryItemDetailsPdfDialogRoot,
);
