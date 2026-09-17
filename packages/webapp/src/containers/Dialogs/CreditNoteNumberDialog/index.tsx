import React from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose, saveInvoke } from '@/utils';

const CreditNoteNumberDialogContent = React.lazy(() =>
  import('./CreditNoteNumberDialogContent'),
);

/**
 * Credit note number dialog.
 */
interface CreditNoteNumberDialogProps
  extends DialogReduxProps<{ initialFormValues?: Record<string, unknown> }> {
  onConfirm?: (values: Record<string, unknown>) => void;
}

function CreditNoteNumberDialog({
  dialogName,
  payload: { initialFormValues } = {},
  isOpen,
  onConfirm,
}: CreditNoteNumberDialogProps) {
  const handleConfirm = (values: Record<string, unknown>) => {
    saveInvoke(onConfirm, values);
  };

  return (
    <Dialog
      title={<T id={'credit_note_number_settings'} />}
      name={dialogName}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        <CreditNoteNumberDialogContent
          initialValues={{ ...initialFormValues }}
          onConfirm={handleConfirm}
        />
      </DialogSuspense>
    </Dialog>
  );
}
export default compose(withDialogRedux())(CreditNoteNumberDialog);
