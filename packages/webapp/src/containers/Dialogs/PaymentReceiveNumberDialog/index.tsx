import React, { lazy } from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { saveInvoke, compose } from '@/utils';

const PaymentReceiveNumbereDialogContent = lazy(
  () => import('./PaymentReceiveNumberDialogContent'),
);

/**
 * Payment receive number dialog.
 */
interface PaymentReceiveNumberDialogProps
  extends DialogReduxProps<{ initialFormValues?: Record<string, unknown> }> {
  onConfirm?: (values: Record<string, unknown>) => void;
}

function PaymentReceiveNumberDialog({
  dialogName,
  payload: { initialFormValues } = {},
  isOpen,
  onConfirm,
}: PaymentReceiveNumberDialogProps) {
  return (
    <Dialog
      title={<T id={'payment_number_settings'} />}
      name={dialogName}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        <PaymentReceiveNumbereDialogContent
          initialValues={initialFormValues}
          onConfirm={(values: Record<string, unknown>) =>
            saveInvoke(onConfirm, values)
          }
        />
      </DialogSuspense>
    </Dialog>
  );
}

export default compose(withDialogRedux())(PaymentReceiveNumberDialog);
