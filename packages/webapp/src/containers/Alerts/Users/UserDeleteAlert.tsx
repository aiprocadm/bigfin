import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useDeleteUser } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface UserDeleteAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { userId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/** Ответ API с типизированными ошибками удаления. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение удаления пользователя (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('user-delete', { userId }).
 */
function UserDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: UserDeleteAlertProps & WithAlertStoreConnectProps & WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deleteUserMutate, isLoading } = useDeleteUser(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const userId = payload?.userId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: удаляем пользователя, показываем тост.
  const handleConfirm = () => {
    deleteUserMutate(userId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_user_has_been_deleted_successfully'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch((error: ApiErrorResponse) => {
        showApiError(error);
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('delete_user')}
      description={intl.getHTML(
        'once_delete_this_user_you_will_able_to_restore_it',
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
)(UserDeleteAlertRoot) as ComponentType<UserDeleteAlertProps>;
