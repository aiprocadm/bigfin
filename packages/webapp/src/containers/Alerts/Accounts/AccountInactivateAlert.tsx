import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useInactivateAccount } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface AccountInactivateAlertProps {
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
 * Подтверждение деактивации счёта (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('account-inactivate', { accountId }).
 */
function AccountInactivateAlertRoot({
  isOpen,
  payload,
  closeAlert,
}: AccountInactivateAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: inactivateAccount, isLoading } = useInactivateAccount(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const accountId = payload?.accountId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert('account-inactivate');
  };

  // Подтверждение: деактивируем счёт, показываем тост, закрываем алерт.
  const handleConfirm = () => {
    inactivateAccount(accountId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_account_has_been_successfully_inactivated'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(showApiError)
      .finally(() => {
        closeAlert('account-inactivate');
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('inactivate_account')}
      description={intl.get('are_sure_to_inactive_this_account')}
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
)(AccountInactivateAlertRoot) as ComponentType<AccountInactivateAlertProps>;
