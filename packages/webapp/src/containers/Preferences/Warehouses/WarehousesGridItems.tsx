import * as React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { useMarkWarehouseAsPrimary } from '@/hooks/query';

import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

import { WarehouseCard, type WarehouseRow } from './components';

interface WarehouseGridItemProps {
  warehouse: WarehouseRow;

  // #withAlertActions
  openAlert: (name: string, payload?: Record<string, unknown>) => void;

  // #withDialogActions
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}

// Легаси-хук без типов — кастуем локально.
const useMarkWarehouseAsPrimaryTyped = useMarkWarehouseAsPrimary as unknown as () => {
  mutateAsync: (warehouseId: number) => Promise<unknown>;
};

/**
 * Карточка склада с действиями (редактировать / сделать основным / удалить).
 */
function WarehouseGridItemRoot({
  warehouse,
  openAlert,
  openDialog,
}: WarehouseGridItemProps) {
  const { mutateAsync: markWarehouseAsPrimaryMutate } =
    useMarkWarehouseAsPrimaryTyped();

  // Открывает диалог редактирования склада.
  const handleEditWarehouse = () => {
    openDialog('warehouse-form', { warehouseId: warehouse.id, action: 'edit' });
  };
  // Открывает алерт удаления склада.
  const handleDeleteWarehouse = () => {
    openAlert('warehouse-delete', { warehouseId: warehouse.id });
  };
  // Помечает склад основным.
  const handleMarkWarehouseAsPrimary = () => {
    markWarehouseAsPrimaryMutate(warehouse.id).then(() => {
      AppToaster.show({
        message: intl.get('warehouse.alert.mark_primary_message'),
        intent: Intent.SUCCESS,
      });
    });
  };

  return (
    <WarehouseCard
      warehouse={warehouse}
      actions={{
        onEdit: handleEditWarehouse,
        onDelete: handleDeleteWarehouse,
        onMarkPrimary: handleMarkWarehouseAsPrimary,
      }}
    />
  );
}

const WarehousesGridItem = compose(
  withAlertActions,
  withDialogActions,
)(WarehouseGridItemRoot) as unknown as React.ComponentType<{
  warehouse: WarehouseRow;
}>;

/**
 * Карточки складов.
 */
export default function WarehousesGridItems({
  warehouses,
}: {
  warehouses: WarehouseRow[];
}) {
  return (
    <>
      {warehouses.map((warehouse) => (
        <WarehousesGridItem key={warehouse.id} warehouse={warehouse} />
      ))}
    </>
  );
}
