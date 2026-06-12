// @ts-nocheck
import React, { lazy } from 'react';
import classNames from 'classnames';

import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';

import withDialogRedux from '@/components/DialogReduxConnect';

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
function TrialBalanceSheetPdfDialogRoot({ dialogName, payload, isOpen }) {
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
        <TrialBalanceSheetPdfDialogContent
          dialogName={dialogName}
          subscriptionForm={payload}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export const TrialBalanceSheetPdfDialog = compose(withDialogRedux())(
  TrialBalanceSheetPdfDialogRoot,
);
