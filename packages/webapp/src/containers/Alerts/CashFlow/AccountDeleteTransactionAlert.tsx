import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useMoveToTrash } from '@/hooks/query/bankingTrash';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

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
  // Удаление — в корзину (FT-042 ТЗ-3): из отчётов уходит сразу, вернуть
  // можно 90 дней. Безвозвратно удаляет только владелец — из корзины.
  const { mutateAsync: moveToTrash, isLoading } = useMoveToTrash();
  const deleteTransactionMutate = (id?: number | string) =>
    moveToTrash([{ kind: 'cashflow', id: Number(id) }]);
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
          message: intl.get('cash_flow_transaction.delete.trashed'),
          intent: Intent.SUCCESS,
        });
        closeDrawer(DRAWERS.CASHFLOW_TRNASACTION_DETAILS);
      })
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('cash_flow_transaction.delete.title')}
      description={intl.get('cash_flow_transaction.delete.to_trash')}
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
