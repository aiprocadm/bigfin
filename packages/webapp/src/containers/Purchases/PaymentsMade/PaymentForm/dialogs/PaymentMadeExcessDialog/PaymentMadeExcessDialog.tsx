// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { Dialog, DialogSuspense } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const ExcessPaymentDialogContent = React.lazy(() =>
  import('./PaymentMadeExcessDialogContent').then((module) => ({
    default: module.ExcessPaymentDialogContent,
  })),
);

/**
 * Exess payment dialog of the payment made form.
 */
function ExcessPaymentDialogRoot({ dialogName, isOpen }) {
  return (
    <Dialog
      name={dialogName}
      title={intl.get('excess_payment')}
      isOpen={isOpen}
      canEscapeJeyClose={true}
      autoFocus={true}
      style={{ width: 500 }}
    >
      <DialogSuspense>
        <ExcessPaymentDialogContent dialogName={dialogName} />
      </DialogSuspense>
    </Dialog>
  );
}

export const ExcessPaymentDialog = compose(withDialogRedux())(
  ExcessPaymentDialogRoot,
);

ExcessPaymentDialog.displayName = 'ExcessPaymentDialog';
