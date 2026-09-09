import React from 'react';
import intl from 'react-intl-universal';
import { Dialog, DialogSuspense } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const RuleFormContent = React.lazy(() => import('./RuleFormContent'));

/**
 * Payment mail dialog.
 */
function RuleFormDialogRoot({
  dialogName,
  // Значение по умолчанию обязательно: обёртка отдаёт «ничего», пока окно не
  // открывали, и разбор без него падал бы (Д3 карты v76).
  payload: { bankRuleId = null } = { bankRuleId: null },
  isOpen,
}: DialogReduxProps<{ bankRuleId?: number | null }>) {
  return (
    <Dialog
      name={dialogName}
      title={intl.get(bankRuleId ? 'edit_bank_rule' : 'new_bank_rule')}
      isOpen={isOpen}
      // Было `canEscapeKeyClose` — опечатка в имени, свойство не читал
      // никто (Д16 карты v82).
      canEscapeKeyClose={true}
      autoFocus={true}
      style={{ width: 600 }}
    >
      <DialogSuspense>
        <RuleFormContent
          dialogName={dialogName}
          bankRuleId={bankRuleId ?? undefined}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export const RuleFormDialog = compose(withDialogRedux())(RuleFormDialogRoot);

RuleFormDialog.displayName = 'RuleFormDialog';
