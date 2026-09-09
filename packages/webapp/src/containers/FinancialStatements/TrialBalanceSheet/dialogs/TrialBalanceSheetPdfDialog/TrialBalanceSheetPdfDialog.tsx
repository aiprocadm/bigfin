import React, { lazy } from 'react';
import classNames from 'classnames';

import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';

import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';

import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

// Lazy loading the content.
const TrialBalanceSheetPdfDialogContent = lazy(
  () => import('./TrialBalanceSheetPdfDialogContent'),
);

/**
 * Trial balance sheet pdf preview dialog.
 * @returns {React.ReactNode}
 */
function TrialBalanceSheetPdfDialogRoot({ dialogName, payload, isOpen }: DialogReduxProps) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'trial_balance_sheet_preview.dialog.title'} />}
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
        <TrialBalanceSheetPdfDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const TrialBalanceSheetPdfDialog = compose(withDialogRedux())(
  TrialBalanceSheetPdfDialogRoot,
);
