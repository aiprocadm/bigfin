import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useDeleteCashflowTransaction } from '@/hooks/query';
import { compose } from '@/utils';

interface AccountDeleteTransactionAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { referenceId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string) => void;
}

/** Ответ API с типизированными ошибками удаления. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение удаления денежной операции (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('account-delete-transaction', { referenceId }).
 */
function AccountDeleteTransactionAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
  closeDrawer,
}: AccountDeleteTransactionAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deleteTransactionMutate, isLoading } =
    useDeleteCashflowTransaction({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const referenceId = payload?.referenceId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: удаляем операцию, показываем тост, закрываем drawer.
  const handleConfirm = () => {
    deleteTransactionMutate(referenceId)
      .then(() => {
        AppToaster.show({
          message: intl.get('cash_flow_transaction.delete.alert_message'),
          intent: Intent.SUCCESS,
        });
        closeDrawer(DRAWERS.CASHFLOW_TRNASACTION_DETAILS);
      })
      .catch((error: ApiErrorResponse) => {
        const errors = error.response?.data?.errors;
        if (
          errors?.find(
            (e) =>
              e.type ===
              'CANNOT_DELETE_TRANSACTION_CONVERTED_FROM_UNCATEGORIZED',
          )
        ) {
          AppToaster.show({
            message: intl.get(
              'cashflow.error.cannot_delete_transaction_converted_from_uncategorized',
            ),
            intent: Intent.DANGER,
          });
        } else if (
          errors?.find((e) => e.type === 'CANNOT_DELETE_TRANSACTION_MATCHED')
        ) {
          AppToaster.show({
            message: intl.get(
              'invoices.error.cannot_delete_transaction_matched_with_bank',
            ),
            intent: Intent.DANGER,
          });
        }
      })
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('cash_flow_transaction.delete.title')}
      description={intl.getHTML(
        'cash_flow_transaction_once_delete_this_transaction_you_will_able_to_restore_it',
      )}
      confirmLabel={intl.get('delete')}
      intent="danger"
      loading={isLoading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

// withAlertStoreConnect — легаси-HOC (без типов): mapState фактически
// необязателен, кастуем сигнатуру локально, не трогая общий модуль.
const withAlertStoreConnectLoose = withAlertStoreConnect as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ name: string }>;

export default compose(
  withAlertStoreConnectLoose(),
  withAlertActions,
  withDrawerActions,
)(AccountDeleteTransactionAlertRoot) as ComponentType<AccountDeleteTransactionAlertProps>;
