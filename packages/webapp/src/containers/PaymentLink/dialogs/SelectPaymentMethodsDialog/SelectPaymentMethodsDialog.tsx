// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { Dialog, DialogSuspense } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const SelectPaymentMethodsDialogContent = React.lazy(() =>
  import('./SelectPaymentMethodsContent').then((module) => ({
    default: module.SelectPaymentMethodsContent,
  })),
);

/**
 * Select payment methods dialogs.
 */
function SelectPaymentMethodsDialogRoot({ dialogName, payload, isOpen }) {
  return (
    <Dialog
      name={dialogName}
      isOpen={isOpen}
      payload={payload}
      title={intl.get('payment_link.dialog.share_link')}
      canEscapeJeyClose={true}
      autoFocus={true}
      style={{ width: 570 }}
    >
      <DialogSuspense>
        <SelectPaymentMethodsDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const SelectPaymentMethodsDialog = compose(withDialogRedux())(
  SelectPaymentMethodsDialogRoot,
);

SelectPaymentMethodsDialog.displayName = 'SelectPaymentMethodsDialog';
