import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { handleDeleteErrors } from '@/containers/Preferences/Warehouses/utils';
import { useDeleteWarehouse } from '@/hooks/query';
import { compose } from '@/utils';

interface WarehouseDeleteAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { warehouseId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/** Ответ API с типизированными ошибками удаления. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение удаления склада (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('warehouse-delete', { warehouseId }).
 */
function WarehouseDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: WarehouseDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deleteWarehouseMutate, isLoading } = useDeleteWarehouse(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const warehouseId = payload?.warehouseId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: удаляем склад, показываем тост.
  const handleConfirm = () => {
    deleteWarehouseMutate(warehouseId)
      .then(() => {
        AppToaster.show({
          message: intl.get('warehouse.alert.delete_message'),
          intent: Intent.SUCCESS,
        });
      })
      .catch((error: ApiErrorResponse) => {
        const errors = error.response?.data?.errors;
        if (errors) {
          handleDeleteErrors(errors);
        }
      })
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('delete_warehouse')}
      description={intl.getHTML('warehouse.once_delete_this_warehouse')}
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
)(WarehouseDeleteAlertRoot) as ComponentType<WarehouseDeleteAlertProps>;
