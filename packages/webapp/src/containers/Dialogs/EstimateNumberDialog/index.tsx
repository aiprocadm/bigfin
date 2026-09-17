import React, { lazy } from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { saveInvoke, compose } from '@/utils';

const EstimateNumberDialogContent = lazy(
  () => import('./EstimateNumberDialogContent'),
);

/**
 * Estimate number dialog.
 */
interface EstimateNumberDialogProps
  extends DialogReduxProps<{ initialFormValues?: Record<string, unknown> }> {
  onConfirm?: (values: Record<string, unknown>) => void;
}

function EstimateNumberDialog({
  dialogName,
  payload: { initialFormValues } = {},
  isOpen,
  onConfirm,
}: EstimateNumberDialogProps) {
  const handleConfirm = (values: Record<string, unknown>) => {
    saveInvoke(onConfirm, values);
  };

  return (
    <Dialog
      name={dialogName}
      title={<T id={'Estimate_number_settings'} />}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      className={'dialog--journal-number-settings'}
    >
      <DialogSuspense>
        <EstimateNumberDialogContent
          initialValues={{ ...initialFormValues }}
          onConfirm={handleConfirm}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export default compose(withDialogRedux())(EstimateNumberDialog);
