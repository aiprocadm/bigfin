import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useDeleteWarehouseTransfer } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface WarehouseTransferDeleteAlertProps {
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
interface WithDrawerActionsProps {
  closeDrawer: (name: string) => void;
}

/**
 * Подтверждение удаления перемещения между складами (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('warehouse-transfer-delete', { warehouseTransferId }).
 */
function WarehouseTransferDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
  closeDrawer,
}: WarehouseTransferDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deleteWarehouseTransferMutate, isLoading } =
    useDeleteWarehouseTransfer({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const warehouseTransferId = payload?.warehouseTransferId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: удаляем перемещение, показываем тост, закрываем drawer.
  const handleConfirm = () => {
    deleteWarehouseTransferMutate(warehouseTransferId)
      .then(() => {
        AppToaster.show({
          message: intl.get('warehouse_transfer.alert.delete_message'),
          intent: Intent.SUCCESS,
        });
        closeDrawer(DRAWERS.WAREHOUSE_TRANSFER_DETAILS);
      })
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('delete_warehouse_transfer')}
      description={intl.getHTML(
        'warehouse_transfer.once_delete_this_warehouse_transfer',
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
  withDrawerActions,
)(WarehouseTransferDeleteAlertRoot) as ComponentType<WarehouseTransferDeleteAlertProps>;
