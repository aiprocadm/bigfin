import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { useMarkWarehouseAsPrimary } from '@/hooks/query';
import { compose } from '@/utils';

interface WarehouseMarkPrimaryAlertProps {
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

/**
 * Подтверждение назначения склада основным (shadcn ConfirmDialog).
 * В легаси вызов мутации был закомментирован (компонент падал на confirm);
 * восстановлен импортированный useMarkWarehouseAsPrimary по замыслу автора.
 */
function WarehouseMarkPrimaryAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: WarehouseMarkPrimaryAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: markPrimaryWarehouseMutate, isLoading } =
    useMarkWarehouseAsPrimary({}) as unknown as {
      mutateAsync: (id?: number | string) => Promise<unknown>;
      isLoading: boolean;
    };
  const warehouseId = payload?.warehouseId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: делаем склад основным, показываем тост.
  const handleConfirm = () => {
    markPrimaryWarehouseMutate(warehouseId)
      .then(() => {
        AppToaster.show({
          message: intl.get('warehouse.alert.mark_primary_message'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('make_primary')}
      description={intl.get('warehouse.alert.are_you_sure_you_want_to_make')}
      confirmLabel={intl.get('make_primary')}
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
)(WarehouseMarkPrimaryAlertRoot) as ComponentType<WarehouseMarkPrimaryAlertProps>;
