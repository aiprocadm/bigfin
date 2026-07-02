import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useInactivateUser } from '@/hooks/query';
import { compose } from '@/utils';

interface UserInactivateAlertProps {
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

/** Ответ API с типизированными ошибками. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение деактивации пользователя (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('user-inactivate', { userId }).
 */
function UserInactivateAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: UserInactivateAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: userInactivateMutate, isLoading } = useInactivateUser(
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

  // Подтверждение: деактивируем пользователя, показываем тост.
  const handleConfirm = () => {
    userInactivateMutate(userId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_user_has_been_inactivated_successfully'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch((error: ApiErrorResponse) => {
        const errors = error.response?.data?.errors;
        if (
          errors?.find(
            (e) => e.type === 'CANNOT.TOGGLE.ACTIVATE.AUTHORIZED.USER',
          )
        ) {
          AppToaster.show({
            message: intl.get('cannot_toggle_activate_authorized_user'),
            intent: Intent.DANGER,
          });
        }
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('inactivate_user')}
      description={intl.get('are_sure_to_inactive_this_user')}
      confirmLabel={intl.get('inactivate')}
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
)(UserInactivateAlertRoot) as ComponentType<UserInactivateAlertProps>;
