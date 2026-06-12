// @ts-nocheck
import React, { lazy } from 'react';
import classNames from 'classnames';

import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';

import withDialogRedux from '@/components/DialogReduxConnect';

import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

// Lazy loading the content.
const SalesTaxLiabilityPdfDialogContent = lazy(
  () => import('./SalesTaxLiabilityPdfDialogContent'),
);

/**
 * Cashflow sheet pdf preview dialog.
 * @returns {React.ReactNode}
 */
function SalesTaxLiabilityPdfDialogRoot({ dialogName, payload, isOpen }) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'sales_tax_liability_preview.dialog.title'} />}
      className={classNames(CLASSES.DIALOG_PDF_PREVIEW)}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      style={{ width: '1000px' }}
    >
      <DialogSuspense>
        <SalesTaxLiabilityPdfDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const SalesTaxLiabiltiyPdfDialog = compose(withDialogRedux())(
  SalesTaxLiabilityPdfDialogRoot,
);
