import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useCancelUnlockingPartialTransactions } from '@/hooks/query';
import { compose } from '@/utils';

interface CancelUnlockingPartialAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { module?: string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение отмены частичной разблокировки операций (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('cancel-unlocking-partial-transactions', { module }).
 */
function CancelUnlockingPartialAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: CancelUnlockingPartialAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: cancelUnlockingPartial, isLoading } =
    useCancelUnlockingPartialTransactions({}) as unknown as {
      mutateAsync: (values: { module?: string }) => Promise<unknown>;
      isLoading: boolean;
    };
  const module = payload?.module;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: отменяем частичную разблокировку, показываем тост.
  const handleConfirm = () => {
    cancelUnlockingPartial({ module })
      .then(() => {
        AppToaster.show({
          message: intl.get(
            'unlocking_partial_transactions.alert.cancel_message',
          ),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {})
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('unlocking_partial_transactions.alert.title')}
      description={intl.get('unlocking_partial_transactions.alert.message')}
      confirmLabel={intl.get('yes')}
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
)(CancelUnlockingPartialAlertRoot) as ComponentType<CancelUnlockingPartialAlertProps>;
