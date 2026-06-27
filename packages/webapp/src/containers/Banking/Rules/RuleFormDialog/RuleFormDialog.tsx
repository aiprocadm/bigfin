// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { Dialog, DialogSuspense } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const RuleFormContent = React.lazy(() => import('./RuleFormContent'));

/**
 * Payment mail dialog.
 */
function RuleFormDialogRoot({
  dialogName,
  payload: { bankRuleId = null },
  isOpen,
}) {
  return (
    <Dialog
      name={dialogName}
      title={intl.get(bankRuleId ? 'edit_bank_rule' : 'new_bank_rule')}
      isOpen={isOpen}
      canEscapeJeyClose={true}
      autoFocus={true}
      style={{ width: 600 }}
    >
      <DialogSuspense>
        <RuleFormContent dialogName={dialogName} bankRuleId={bankRuleId} />
      </DialogSuspense>
    </Dialog>
  );
}

export const RuleFormDialog = compose(withDialogRedux())(RuleFormDialogRoot);

RuleFormDialog.displayName = 'RuleFormDialog';
