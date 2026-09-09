import intl from 'react-intl-universal';
import type { DialogReduxProps } from '@/components/DialogReduxConnect';
import React from 'react';
import { Dialog, DialogSuspense } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const DisconnectBankAccountDialogContent = React.lazy(
  () => import('./DisconnectBankAccountDialogContent'),
);

/**
 * Disconnect bank account confirmation dialog.
 */
function DisconnectBankAccountDialogRoot({
  dialogName,
  payload: { bankAccountId } = { bankAccountId: null },
  isOpen,
}: DialogReduxProps<{ bankAccountId: number | null }>) {
  return (
    <Dialog
      name={dialogName}
      title={intl.get('cashflow.dialog.disconnect_bank_account')}
      isOpen={isOpen}
      canEscapeKeyClose={true}
      autoFocus={true}
      style={{ width: 400 }}
    >
      <DialogSuspense>
        {/* Имя окна содержимое не читает — свойство убрано (Д14 карты v84). */}
        <DisconnectBankAccountDialogContent bankAccountId={bankAccountId} />
      </DialogSuspense>
    </Dialog>
  );
}

export const DisconnectBankAccountDialog = compose(withDialogRedux())(
  DisconnectBankAccountDialogRoot,
);

DisconnectBankAccountDialog.displayName = 'DisconnectBankAccountDialog';
