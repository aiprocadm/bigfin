// @ts-nocheck
import intl from 'react-intl-universal';
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
  payload: { bankAccountId },
  isOpen,
}) {
  return (
    <Dialog
      name={dialogName}
      title={intl.get('cashflow.dialog.disconnect_bank_account')}
      isOpen={isOpen}
      canEscapeJeyClose={true}
      autoFocus={true}
      style={{ width: 400 }}
    >
      <DialogSuspense>
        <DisconnectBankAccountDialogContent
          dialogName={dialogName}
          bankAccountId={bankAccountId}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export const DisconnectBankAccountDialog = compose(withDialogRedux())(
  DisconnectBankAccountDialogRoot,
);

DisconnectBankAccountDialog.displayName = 'DisconnectBankAccountDialog';
