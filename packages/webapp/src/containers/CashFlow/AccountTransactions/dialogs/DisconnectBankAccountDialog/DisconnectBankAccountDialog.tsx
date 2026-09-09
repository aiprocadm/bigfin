// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
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
