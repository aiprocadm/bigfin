import React from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const NotifyPaymentReceiveViaSMSDialogContent = React.lazy(
  () => import('./NotifyPaymentReceiveViaSMSContent'),
);

function NotifyPaymentReciveViaSMSDialog({
  dialogName,
  payload: { paymentReceiveId },
  isOpen,
}: any) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'notify_via_sms.dialog.notify_via_sms'} />}
      isOpen={isOpen}
      canEscapeKeyClose={true}
      autoFocus={true}
      className={'dialog--notify-vis-sms'}
    >
      <DialogSuspense>
        <NotifyPaymentReceiveViaSMSDialogContent
          dialogName={dialogName}
          paymentReceive={paymentReceiveId}
        />
      </DialogSuspense>
    </Dialog>
  );
}
export default compose(withDialogRedux())(NotifyPaymentReciveViaSMSDialog);
