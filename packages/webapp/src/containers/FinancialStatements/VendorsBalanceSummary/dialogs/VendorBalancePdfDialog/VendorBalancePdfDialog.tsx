// @ts-nocheck
import React, { lazy } from 'react';
import classNames from 'classnames';

import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

// Lazy loading the content.
const VendorBalancePdfDialogContent = lazy(
  () => import('./VendorBalancePdfDialogContent'),
);

/**
 * Vendor balance sheet pdf preview dialog.
 * @returns {React.ReactNode}
 */
function VendorBalancePdfDialogRoot({ dialogName, payload, isOpen }) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'vendor_balance_summary_preview.dialog.title'} />}
      className={classNames(CLASSES.DIALOG_PDF_PREVIEW)}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      style={{ width: '1000px' }}
    >
      <DialogSuspense>
        <VendorBalancePdfDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const VendorBalancePdfDialog = compose(withDialogRedux())(
  VendorBalancePdfDialogRoot,
);
