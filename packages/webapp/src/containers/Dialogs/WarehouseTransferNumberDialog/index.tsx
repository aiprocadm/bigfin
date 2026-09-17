import React from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose, saveInvoke } from '@/utils';

const WarehouseTransferNumberDialogContent = React.lazy(
  () => import('./WarehouseTransferNumberDialogContent'),
);

/**
 * Warehouse transfer number dialog.
 */
interface WarehouseTransferNumberDilaogProps
  extends DialogReduxProps<{ initialFormValues?: Record<string, unknown> }> {
  onConfirm?: (values: Record<string, unknown>) => void;
}

function WarehouseTransferNumberDilaog({
  dialogName,
  payload: { initialFormValues } = {},
  isOpen,
  onConfirm,
}: WarehouseTransferNumberDilaogProps) {
  const handleConfirm = (values: Record<string, unknown>) => {
    saveInvoke(onConfirm, values);
  };
  return (
    <Dialog
      title={<T id={'warehouse_transfer_no_settings'} />}
      name={dialogName}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        <WarehouseTransferNumberDialogContent
          initialValues={{ ...initialFormValues }}
          onConfirm={handleConfirm}
        />
      </DialogSuspense>
    </Dialog>
  );
}
export default compose(withDialogRedux())(WarehouseTransferNumberDilaog);
