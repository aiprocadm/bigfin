import React, { lazy } from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose, saveInvoke } from '@/utils';

const ReceiptNumberDialogContent = lazy(
  () => import('./ReceiptNumberDialogContent'),
);

interface ReceiptNumberDialogProps
  extends DialogReduxProps<{ initialFormValues?: Record<string, unknown> }> {
  onConfirm?: (values: Record<string, unknown>) => void;
}

/**
 * Sale receipt number dialog.
 */
function ReceiptNumberDialog({
  dialogName,
  // Значение по умолчанию обязательно: обёртка отдаёт «ничего», пока окно не
  // открывали, и разбор без него падал бы (Д3 карты v76).
  payload: { initialFormValues = {} } = {},
  isOpen,
  onConfirm,
}: ReceiptNumberDialogProps) {
  const handleConfirm = (values: Record<string, unknown>) => {
    saveInvoke(onConfirm, values);
  };

  return (
    <Dialog
      name={dialogName}
      title={<T id={'receipt_number_settings'} />}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        <ReceiptNumberDialogContent
          initialValues={{ ...initialFormValues }}
          onConfirm={handleConfirm}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export default compose(withDialogRedux())(ReceiptNumberDialog);
