// @ts-nocheck
import React, { lazy } from 'react';
import classNames from 'classnames';

import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';

import withDialogRedux from '@/components/DialogReduxConnect';

import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

// Lazy loading the content.
const CashflowSheetPdfDialogContent = lazy(
  () => import('./CashflowSheetPdfDialogContent'),
);

/**
 * Cashflow sheet pdf preview dialog.
 * @returns {React.ReactNode}
 */
function CashflowSheetPdfDialogRoot({ dialogName, payload, isOpen }) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'cashflow_sheet_preview.dialog.title'} />}
      className={classNames(CLASSES.DIALOG_PDF_PREVIEW)}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      style={{ width: '1000px' }}
    >
      <DialogSuspense>
        <CashflowSheetPdfDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const CashflowSheetPdfDialog = compose(withDialogRedux())(
  CashflowSheetPdfDialogRoot,
);
