// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { Dialog, DialogSuspense } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const SharePaymentLinkContent = React.lazy(() =>
  import('./SharePaymentLinkContent').then((module) => ({
    default: module.SharePaymentLinkContent,
  })),
);

/**
 * 
 */
function SharePaymentLinkDialogRoot({ dialogName, payload, isOpen }) {
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
        <SharePaymentLinkContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const SharePaymentLinkDialog = compose(withDialogRedux())(
  SharePaymentLinkDialogRoot,
);

SharePaymentLinkDialog.displayName = 'SharePaymentLinkDialog';
