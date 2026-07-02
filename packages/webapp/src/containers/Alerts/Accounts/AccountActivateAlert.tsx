import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useActivateAccount } from '@/hooks/query';
import { compose } from '@/utils';

interface AccountActivateAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { accountId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение активации счёта (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('account-activate', { accountId }).
 */
function AccountActivateAlertRoot({
  isOpen,
  payload,
  closeAlert,
}: AccountActivateAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: activateAccount, isLoading } = useActivateAccount(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const accountId = payload?.accountId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert('account-activate');
  };

  // Подтверждение: активируем счёт, показываем тост, закрываем алерт.
  const handleConfirm = () => {
    activateAccount(accountId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_account_has_been_successfully_activated'),
          intent: Intent.SUCCESS,
        });
        closeAlert('account-activate');
      })
      .finally(() => {
        closeAlert('account-activate');
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('activate_account')}
      description={intl.get('are_sure_to_activate_this_account')}
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
)(AccountActivateAlertRoot) as ComponentType<AccountActivateAlertProps>;
