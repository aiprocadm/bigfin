import React from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose, saveInvoke } from '@/utils';

const VendorCreditNumberDialogContent = React.lazy(() =>
  import('./VendorCreditNumberDialogContent'),
);

/**
 * Vendor Credit number dialog.
 */
interface VendorCreditNumberDialogProps
  extends DialogReduxProps<{ initialFormValues?: Record<string, unknown> }> {
  onConfirm?: (values: Record<string, unknown>) => void;
}

function VendorCreditNumberDialog({
  dialogName,
  payload: { initialFormValues } = {},
  isOpen,
  onConfirm,
}: VendorCreditNumberDialogProps) {
  const handleConfirm = (values: Record<string, unknown>) => {
    saveInvoke(onConfirm, values);
  };

  return (
    <Dialog
      title={<T id={'vendor_credit_number_settings'} />}
      name={dialogName}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        <VendorCreditNumberDialogContent
          initialValues={{ ...initialFormValues }}
          onConfirm={handleConfirm}
        />
      </DialogSuspense>
    </Dialog>
  );
}
export default compose(withDialogRedux())(VendorCreditNumberDialog);
