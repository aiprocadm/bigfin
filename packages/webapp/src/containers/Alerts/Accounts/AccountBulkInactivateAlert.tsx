import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useBulkInactivateAccounts } from '@/hooks/query/accounts';
import { compose } from '@/utils';

interface AccountBulkInactivateAlertProps {
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
 * Подтверждение массовой деактивации счетов (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('accounts-bulk-inactivate', { accountsIds }).
 */
function AccountBulkInactivateAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: AccountBulkInactivateAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: bulkInactivateAccounts, isLoading } =
    useBulkInactivateAccounts({}) as unknown as {
      mutateAsync: (ids?: (number | string)[]) => Promise<unknown>;
      isLoading: boolean;
    };
  const accountsIds = payload?.accountsIds;
  const selectedRowsCount = accountsIds?.length || 0;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: деактивируем выбранные счета, показываем тост.
  const handleConfirm = () => {
    bulkInactivateAccounts(accountsIds)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_accounts_have_been_successfully_inactivated'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('something_went_wrong'),
          intent: Intent.DANGER,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('inactivate_accounts')}
      description={intl.get('are_sure_to_inactive_this_accounts')}
      confirmLabel={`${intl.get('inactivate')} (${selectedRowsCount})`}
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
)(AccountBulkInactivateAlertRoot) as ComponentType<AccountBulkInactivateAlertProps>;
