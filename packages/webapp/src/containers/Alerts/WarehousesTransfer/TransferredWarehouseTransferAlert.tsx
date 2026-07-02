import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useTransferredWarehouseTransfer } from '@/hooks/query';
import { compose } from '@/utils';

interface TransferredWarehouseTransferAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { warehouseTransferId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение доставки перемещения между складами (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('transferred-warehouse-transfer', { warehouseTransferId }).
 */
function TransferredWarehouseTransferAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: TransferredWarehouseTransferAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: transferredWarehouseTransferMutate, isLoading } =
    useTransferredWarehouseTransfer({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const warehouseTransferId = payload?.warehouseTransferId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: отмечаем перемещение доставленным, показываем тост.
  const handleConfirm = () => {
    transferredWarehouseTransferMutate(warehouseTransferId)
      .then(() => {
        AppToaster.show({
          message: intl.get('warehouse_transfer.alert.transferred_warehouse'),
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
      title={intl.get('warehouse_transfer.deliver.title')}
      description={intl.get(
        'warehouse_transfer.alert.are_you_sure_you_want_to_deliver',
      )}
      confirmLabel={intl.get('deliver')}
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
)(TransferredWarehouseTransferAlertRoot) as ComponentType<TransferredWarehouseTransferAlertProps>;
