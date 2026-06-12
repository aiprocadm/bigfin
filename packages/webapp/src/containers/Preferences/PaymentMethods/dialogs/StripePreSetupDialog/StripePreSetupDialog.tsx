// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { Dialog, DialogSuspense } from '@/components';
import { compose } from '@/utils';
import withDialogRedux from '@/components/DialogReduxConnect';
import { StripePreSetupDialogContent } from './StripePreSetupDialogContent';

/**
 * Select payment methods dialogs.
 */
function StripePreSetupDialogRoot({ dialogName, payload, isOpen }) {
  return (
    <Dialog
      name={dialogName}
      isOpen={isOpen}
      payload={payload}
      title={intl.get('preferences.payment_methods.stripe.pre_setup.title')}
      canEscapeJeyClose={true}
      autoFocus={true}
      style={{ width: 500 }}
    >
      <DialogSuspense>
        <StripePreSetupDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const StripePreSetupDialog = compose(withDialogRedux())(
  StripePreSetupDialogRoot,
);

StripePreSetupDialogRoot.displayName = 'StripePreSetupDialog';
