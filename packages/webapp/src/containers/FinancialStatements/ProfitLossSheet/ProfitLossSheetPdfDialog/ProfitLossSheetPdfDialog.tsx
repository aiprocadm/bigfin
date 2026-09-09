import React, { lazy } from 'react';
import classNames from 'classnames';

import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';

import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';

import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

// Lazy loading the content.
const ProfitLossSheetPdfDialogContent = lazy(
  () => import('./ProfitLossSheetPdfDialogContent'),
);

/**
 * Cashflow sheet pdf preview dialog.
 * @returns {React.ReactNode}
 */
function ProfitLossSheetPdfDialogRoot({ dialogName, payload, isOpen }: DialogReduxProps) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'profit_loss_sheet_preview.dialog.title'} />}
      className={classNames(CLASSES.DIALOG_PDF_PREVIEW)}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      style={{ width: '1000px' }}
    >
      <DialogSuspense>
        {/* Содержимое окна не принимает свойств вовсе: `dialogName` и
            `subscriptionForm` сюда передавали, но никто их не читал
            (Д2 карты v83). */}
        <ProfitLossSheetPdfDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const ProfitLossSheetPdfDialog = compose(withDialogRedux())(
  ProfitLossSheetPdfDialogRoot,
);
