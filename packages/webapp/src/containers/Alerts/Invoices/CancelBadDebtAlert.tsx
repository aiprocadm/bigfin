import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useCancelBadDebt } from '@/hooks/query';
import { compose } from '@/utils';

interface CancelBadDebtAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { invoiceId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение отмены списания счёта как безнадёжного долга
 * (shadcn ConfirmDialog). Механизм прежний:
 * redux openAlert('cancel-bad-debt', { invoiceId }).
 */
function CancelBadDebtAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: CancelBadDebtAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: cancelBadDebtMutate, isLoading } = useCancelBadDebt(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const invoiceId = payload?.invoiceId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: отменяем списание, показываем тост.
  const handleConfirm = () => {
    cancelBadDebtMutate(invoiceId)
      .then(() => {
        AppToaster.show({
          message: intl.get('bad_debt.cancel_alert.success_message'),
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
      title={intl.get('bad_debt.cancel_alert.message')}
      confirmLabel={intl.get('save')}
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
)(CancelBadDebtAlertRoot) as ComponentType<CancelBadDebtAlertProps>;
