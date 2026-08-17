import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useBulkActivateAccounts } from '@/hooks/query/accounts';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface AccountBulkActivateAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { accountsIds?: (number | string)[] };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение массовой активации счетов (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('accounts-bulk-activate', { accountsIds }).
 */
function AccountBulkActivateAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: AccountBulkActivateAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: bulkActivateAccounts, isLoading } =
    useBulkActivateAccounts({}) as unknown as {
      mutateAsync: (ids?: (number | string)[]) => Promise<unknown>;
      isLoading: boolean;
    };
  const accountsIds = payload?.accountsIds;
  const selectedRowsCount = accountsIds?.length || 0;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: активируем выбранные счета, показываем тост.
  const handleConfirm = () => {
    bulkActivateAccounts(accountsIds)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_accounts_has_been_successfully_activated'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('activate_accounts')}
      description={intl.get('are_sure_to_activate_this_accounts')}
      confirmLabel={`${intl.get('activate')} (${selectedRowsCount})`}
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
)(AccountBulkActivateAlertRoot) as ComponentType<AccountBulkActivateAlertProps>;
