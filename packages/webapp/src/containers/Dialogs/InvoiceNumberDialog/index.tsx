import React, { lazy } from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose, saveInvoke } from '@/utils';

const InvoiceNumberDialogContent = lazy(
  () => import('./InvoiceNumberDialogContent'),
);

/**
 * Invoice number dialog.
 */
interface InvoiceNumberDialogProps
  extends DialogReduxProps<{ initialFormValues?: Record<string, unknown> }> {
  onConfirm?: (values: Record<string, unknown>) => void;
}

function InvoiceNumberDialog({
  dialogName,
  payload: { initialFormValues } = {},
  isOpen,
  onConfirm,
}: InvoiceNumberDialogProps) {
  const handleConfirm = (values: Record<string, unknown>) => {
    saveInvoke(onConfirm, values);
  };

  return (
    <Dialog
      title={<T id={'invoice_number_settings'} />}
      name={dialogName}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        <InvoiceNumberDialogContent
          initialValues={{ ...initialFormValues }}
          onConfirm={handleConfirm}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export default compose(withDialogRedux())(InvoiceNumberDialog);
