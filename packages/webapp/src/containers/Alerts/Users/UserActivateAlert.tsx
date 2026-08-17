import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useActivateUser } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface UserActivateAlertProps {
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

/**
 * Подтверждение активации пользователя (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('user-activate', { userId }).
 */
function UserActivateAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: UserActivateAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: userActivateMutate, isLoading } = useActivateUser(
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

  // Подтверждение: активируем пользователя, показываем тост.
  const handleConfirm = () => {
    userActivateMutate(userId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_user_has_been_activated_successfully'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch((error) => {
        showApiError(error);
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('activate_user')}
      description={intl.get('are_sure_to_activate_this_user')}
      confirmLabel={intl.get('activate')}
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
)(UserActivateAlertRoot) as ComponentType<UserActivateAlertProps>;
